"""Normalize public GCAT tables into a versioned Threadline source-data snapshot.

Run with --source-dir to reuse downloaded TSVs, or without it to refresh over HTTPS.
Raw downloads stay outside the repository. The generated JSON is the experiment's
attributed source fixture; builds never contact the upstream service.
"""
import argparse
import collections
import csv
import datetime as dt
import hashlib
import io
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
URLS = {
    'launch': 'https://planet4589.org/space/gcat/tsv/launch/launch.tsv',
    'orgs': 'https://planet4589.org/space/gcat/tsv/tables/orgs.tsv',
    'sites': 'https://planet4589.org/space/gcat/tsv/tables/sites.tsv',
    'missions': 'https://planet4589.org/space/astro/tsv/missions.tsv',
}
COLORS = ['#476e5e', '#b97345', '#6486a5', '#9a6e89', '#c39a42', '#627a7d', '#887e70']

def table(text):
    return [{k.lstrip('#'): v.strip() for k, v in row.items()} for row in csv.DictReader((line for line in io.StringIO(text) if not line.startswith('# Updated')), delimiter='\t')]

def timestamp(value):
    try:
        return dt.datetime.strptime(value[:16].strip(), '%Y %b %d %H%M')
    except ValueError:
        return None

def date(value):
    # Preserve year/month/day precision and uncertainty; never manufacture Jan 1.
    import re
    match = re.match(r'^(\d{4})(?:\s+([A-Za-z]{3})(?:\s+(\d{1,2}))?)?', value)
    if not match:
        return None
    year, month, day = match.groups()
    if not month:
        return year
    try:
        month_number = dt.datetime.strptime(month, '%b').month
        return f'{year}-{month_number:02}' + (f'-{int(day):02}' if day else '')
    except ValueError:
        return year

def name(row):
    return next((row.get(k) for k in ('ShortEName', 'ShortName', 'EName', 'Name') if row.get(k) not in (None, '-', '')), 'Unknown')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', type=Path)
    args = parser.parse_args()
    raw = {key: (args.source_dir / f'threadline-{key}.tsv').read_text() if args.source_dir else urllib.request.urlopen(url, timeout=60).read().decode() for key, url in URLS.items()}
    tables = {key: table(text) for key, text in raw.items()}
    orgs = {x['Code']: x for x in tables['orgs']}
    sites = {x['Site']: x for x in tables['sites']}
    launches = [x for x in tables['launch'] if x['LaunchCode'].startswith(('O', 'D')) and x['LaunchCode'][1:2] not in ('E', 'A')]
    # Some source launch operators are composite codes rather than org table rows.
    # Resolve only documented members; preserve unresolved/uncertain codes.
    for key in {launch['Agency'] for launch in launches} - set(orgs):
        members = [orgs.get(code) for code in key.split('/')]
        if len(members) > 1 and all(members):
            states = list(dict.fromkeys(member['StateCode'] for member in members))
            parents = {member['Parent'] for member in members} - {'-', ''}
            orgs[key] = {'ShortName': ' / '.join(name(member) for member in members),
                         'StateCode': states[0] if len(states) == 1 else states,
                         'Parent': next(iter(parents)) if len(parents) == 1 and all(member['Parent'] in parents for member in members) else '-'}
    by_day = collections.defaultdict(list)
    for launch in launches:
        stamp = timestamp(launch['Launch_Date'])
        if stamp:
            by_day[stamp.date()].append((stamp, launch))
    human = {}
    for mission in tables['missions']:
        if mission['MType'] != 'FLT' or not mission['OrbID'].startswith('ORB'):
            continue
        stamp = timestamp(mission['LDate'])
        candidates = [launch for time, launch in by_day[stamp.date()] if abs((stamp - time).total_seconds()) <= 120] if stamp else []
        if len(candidates) != 1:
            raise ValueError(f'Human flight join is missing or ambiguous: {mission["Ship"]}')
        if candidates[0]['Launch_Tag'] in human:
            raise ValueError('Duplicate human launch join')
        human[candidates[0]['Launch_Tag']] = mission
    update = next(line.removeprefix('# Updated ').strip() for line in raw['missions'].splitlines() if line.startswith('# Updated'))
    crew_cutoff = date(update)
    highlights = {
        '1957 ALP': 'Sputnik 1', '1958 ALP': 'Explorer 1', '1961 MU': 'Vostok 1',
        '1962 GAM': 'Friendship 7', '1965-024': 'Gemini 3', '1968-118': 'Apollo 8',
        '1969-059': 'Apollo 11', '1971-032': 'Salyut 1', '1977-076': 'Voyager 2',
        '1977-084': 'Voyager 1', '1979-104': 'Ariane 1', '1980-062': 'Rohini RS-1',
        '1981-034': 'STS-1', '1986-017': 'Mir', '1990-037': 'Hubble Space Telescope',
        '1998-067': 'Zarya', '2003-045': 'Shenzhou 5', '2008-048': 'Falcon 1 · Flight 4',
        '2008-052': 'Chandrayaan-1', '2012-027': 'Dragon · COTS 2',
        '2020-033': 'Dragon · Demo-2', '2021-130': 'James Webb Space Telescope',
        '2022-156': 'Artemis I', '2023-098': 'Chandrayaan-3',
    }
    missing = set(highlights) - {x['Launch_Tag'] for x in launches}
    if missing:
        raise ValueError(f'Missing highlight launches: {missing}')
    country_counts = collections.Counter()
    for launch in launches:
        state = orgs.get(launch['Agency'], {}).get('StateCode', 'unknown')
        country_counts.update(state if isinstance(state, list) else [state])
    agency_counts = collections.Counter(x['Agency'] for x in launches)
    countries = [{'id': key, 'label': name(orgs[key]) if key in orgs else 'Unknown' if key == 'unknown' else key, 'color': COLORS[i % len(COLORS)]} for i, (key, _) in enumerate(country_counts.most_common())]
    # Parent organizations support a genuine nested rail split (e.g. NASA → MSFC).
    parents = {orgs.get(key, {}).get('Parent') for key in agency_counts} - {None, '-', ''}
    agencies = [{'id': key, 'label': name(orgs[key]) if key in orgs else key, 'color': COLORS[i % len(COLORS)], **({'parent': orgs[key]['Parent']} if orgs.get(key, {}).get('Parent') in parents and key not in parents else {})} for i, (key, _) in enumerate(agency_counts.most_common())]
    for parent in sorted(parents - set(agency_counts)):
        agencies.append({'id': parent, 'label': name(orgs[parent]) if parent in orgs else parent, 'color': COLORS[len(agencies) % len(COLORS)]})
    events = []
    for launch in launches:
        tag = launch['Launch_Tag']
        agency = orgs.get(launch['Agency'], {})
        site = sites.get(launch['Launch_Site'], {})
        start = date(launch['Launch_Date'])
        crew = 'crewed' if tag in human else 'uncrewed' if start and start < crew_cutoff else 'unknown'
        code = launch['LaunchCode']
        outcome = 'partial' if any(c.isdigit() for c in code[2:]) else {'S': 'success', 'F': 'failure'}.get(code[1:2], 'unknown')
        title = highlights.get(tag) or next((launch[k] for k in ('Flight', 'Mission', 'Flight_ID') if launch[k] != '-'), f'{launch["LV_Type"]} · {tag}')
        site_name = name(site) if site else launch['Launch_Site']
        attrs = {'country': agency.get('StateCode', 'unknown'), 'organization': launch['Agency'], 'crew': crew, 'outcome': outcome,
                 'site': site_name, 'siteCode': launch['Launch_Site'], 'pad': launch['Launch_Pad'], 'vehicle': launch['LV_Type'],
                 'launchCode': code, 'sourceDate': launch['Launch_Date'], 'launchId': tag, 'siteCountry': site.get('StateCode', 'unknown')}
        if tag in human:
            attrs['crewCount'] = human[tag]['Crew']
            attrs['program'] = human[tag]['Program']
        events.append({'id': tag, 'title': title, 'summary': f'{launch["LV_Type"]} from {site_name}' + (f' · {launch["Launch_Pad"]}' if launch['Launch_Pad'] != '-' else '') + '.',
                       'date': {'start': start, **({'approximate': True} if '?' in launch['Launch_Date'] else {})},
                       'featured': tag in highlights, 'attributes': attrs, 'tags': [launch['LV_Type'], site_name],
                       'sources': [{'label': 'GCAT launch catalogue', 'url': URLS['launch']}] + ([{'label': 'Human-flight catalogue', 'url': 'https://planet4589.org/space/astro/lists/missions.html'}] if crew == 'crewed' else [])})
    doc = {'version': 1, 'id': 'spaceflight', 'title': 'Spaceflight', 'description': 'Orbital and deep-space launch attempts from GCAT. One event per launch, including failures. Excludes pad aborts and pad explosions; suborbital scope is planned.',
           'dimensions': [{'id': 'country', 'label': 'Launch organization country', 'values': countries}, {'id': 'organization', 'label': 'Launch organization', 'values': agencies},
                          {'id': 'crew', 'label': 'Crew status', 'values': [{'id': 'crewed', 'label': 'Crewed', 'color': '#b97345'}, {'id': 'uncrewed', 'label': 'Uncrewed', 'color': '#6486a5'}, {'id': 'unknown', 'label': 'Unknown', 'color': '#887e70'}]},
                          {'id': 'outcome', 'label': 'Launch outcome', 'values': [{'id': 'success', 'label': 'Success', 'color': '#476e5e'}, {'id': 'partial', 'label': 'Partial', 'color': '#c39a42'}, {'id': 'failure', 'label': 'Failure', 'color': '#b97345'}, {'id': 'unknown', 'label': 'Unknown', 'color': '#887e70'}]}],
           'views': [{'id': 'highlights', 'label': 'Highlights', 'mode': 'unified', 'dimension': 'country', 'featuredOnly': True}, {'id': 'everything', 'label': 'Everything', 'mode': 'unified', 'dimension': 'country'},
                     {'id': 'crew', 'label': 'Crew', 'mode': 'split', 'dimension': 'crew'}, {'id': 'countries', 'label': 'Countries', 'mode': 'split', 'dimension': 'country'},
                     {'id': 'organizations', 'label': 'Organizations', 'mode': 'split', 'dimension': 'organization', 'depth': 'parent'}, {'id': 'providers', 'label': 'Branches', 'mode': 'split', 'dimension': 'organization', 'depth': 'leaf'},
                     {'id': 'outcomes', 'label': 'Outcomes', 'mode': 'split', 'dimension': 'outcome'}], 'events': events}
    today = dt.datetime.now(dt.timezone.utc).isoformat()
    manifest = {'retrievedAt': today, 'eventCount': len(events), 'highlightCount': len(highlights), 'matchedHumanFlights': len(human), 'crewCoverageThrough': crew_cutoff,
                'sourceUpdates': {key: next((line.removeprefix('# Updated ').strip() for line in value.splitlines() if line.startswith('# Updated')), 'unknown') for key, value in raw.items()},
                'sourceHashes': {key: hashlib.sha256(value.encode()).hexdigest() for key, value in raw.items()}, 'sourceUrls': URLS,
                'license': 'GCAT: CC-BY-4.0', 'attribution': 'Data from GCAT (J. McDowell, planet4589.org/space/gcat). Human-flight classification joined to J. McDowell’s human-spaceflight mission list.'}
    (ROOT / 'public/data/spaceflight.json').write_text(json.dumps(doc, separators=(',', ':'), ensure_ascii=False) + '\n')
    (ROOT / 'public/data/provenance.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({key: manifest[key] for key in ('eventCount', 'highlightCount', 'matchedHumanFlights', 'crewCoverageThrough')}, indent=2))

if __name__ == '__main__':
    main()
