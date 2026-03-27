# ElectNerds Data Repository

This directory contains the candidate and geographic data for [electnerds.com](https://electnerds.com).

**Note:** This is now managed as a git submodule. All data changes should be made in the public repository at [github.com/iRonJ/ElectNerdsData](https://github.com/iRonJ/ElectNerdsData).

## Folder Structure

```
candidates/
├── federal/
│   ├── president.json          # Presidential candidates
│   └── states/
│       ├── CA.json             # State senators & house representatives
│       ├── NY.json
│       ├── TX.json
│       └── [all other states]   # One file per state (2-letter abbreviation)
└── state-local/
    ├── CA.json                 # State governors, state legislatures, county officials
    ├── NY.json
    ├── TX.json
    └── [all other states]       # One file per state (2-letter abbreviation)

geo/
└── sources.json                # Geographic data source URLs and attribution
```

## How Data Connects to the Map

The map in `app/src/components/map/` renders candidates based on:

1. **View Level** (`ViewLevel`): `'national' | 'state' | 'district'`
   - **National:** Shows all states on the US map; clicking a state zooms to that state
   - **State:** Shows congressional districts (federal) or counties (state-local); clicking opens a district/county detail view
   - **District:** Shows individual candidates for that district/county

2. **Map Mode** (`MapMode`): `'federal' | 'local'`
   - **federal:** Uses `candidates/federal/` data
     - Presidential candidates (national level)
     - Senators & House representatives by state/district
   - **local:** Uses `candidates/state-local/` data
     - Governors
     - State legislatures (state Senate, state House)
     - County officials

3. **Geographic Selection**:
   - States are identified by their **2-letter abbreviation** (e.g., `CA`, `NY`, `TX`)
   - These map to FIPS codes in `app/src/lib/geoHelpers.ts`, which the map uses to highlight and zoom to states
   - Congressional districts use the format `{STATE_ABBR}-{DISTRICT_NUMBER}` (e.g., `CA-12`, `TX-03`)
   - Counties use **FIPS county codes** from your state files (e.g., `06037` for Los Angeles County, CA)

## Data Schema

All candidate data must strictly adhere to the **Candidate interface**:

### Candidate Interface

```typescript
interface Candidate {
  id: string;                      // Unique identifier (e.g., "sen-ca-001")
  name: string;                    // Full name of the candidate
  party: string;                   // Political party (e.g., "Democratic", "Republican", "Independent")
  isNerd: boolean;                 // Whether they meet the "nerd" criteria
  nerdScore: number;               // 0-100 score (0 = not a nerd, 100 = maximum nerd)
  nerdReason: string | null;       // If isNerd=true, explain why they qualify
  notNerdReason: string | null;    // If isNerd=false, explain why they don't qualify
  keyIssues: string[];             // Array of 2-4 key policy areas or expertise
  education: string[];             // Array of degrees/institutions
  experience: string[];            // Array of relevant positions held
  website: string | null;          // Link to personal website or official page
  imageUrl: string | null;         // Link to candidate photo (optional)
}
```

### Federal Data Structure

**File:** `candidates/federal/president.json`

```typescript
interface PresidentialData {
  office: string;              // "President of the United States"
  cycle: number;               // Election year (e.g., 2028)
  candidates: Candidate[];     // Array of candidates
}
```

**File:** `candidates/federal/states/{STATE_ABBR}.json`

```typescript
interface FederalStateData {
  state: string;                      // 2-letter state abbreviation (e.g., "CA")
  stateName: string;                  // Full state name (e.g., "California")
  stateFips: string;                  // 2-digit FIPS code (e.g., "06")
  senators: Candidate[];              // Array of 2 senators
  house: Record<string, Candidate[]>; // Congressional districts as keys (e.g., "CA-01", "CA-12")
                                       // Each district has an array of candidates
}
```

Example for district key format:
- `"CA-01"` → California's 1st Congressional District
- `"TX-33"` → Texas's 33rd Congressional District
- Format: `{STATE_ABBR}-{DISTRICT_NUMBER}` where DISTRICT_NUMBER is 2 digits (padded with 0 if needed)

### State-Local Data Structure

**File:** `candidates/state-local/{STATE_ABBR}.json`

```typescript
interface StateLocalData {
  state: string;                      // 2-letter state abbreviation (e.g., "CA")
  stateName: string;                  // Full state name (e.g., "California")
  stateFips: string;                  // 2-digit FIPS code (e.g., "06")
  governor: Candidate[];              // Array of gubernatorial candidates
  stateSenate: Record<string, Candidate[]>;    // State senate districts as keys
  stateHouse: Record<string, Candidate[]>;     // State house districts as keys
  counties: Record<string, CountyData>;        // County FIPS codes as keys
}

interface CountyData {
  countyName: string;         // Full name (e.g., "Los Angeles County")
  candidates: Candidate[];    // Array of county officials
}
```

Example county FIPS codes:
- `"06037"` → Los Angeles County, CA (6 = CA FIPS, 037 = LA County FIPS)
- `"36061"` → New York County, NY
- Use the full 5-digit FIPS code as the key

## Validation Requirements

### Required Fields

Every candidate object **must** have:
- ✅ `id` (non-empty string, unique within that office)
- ✅ `name` (non-empty string)
- ✅ `party` (non-empty string)
- ✅ `isNerd` (boolean)
- ✅ `nerdScore` (number 0-100)
- ✅ `keyIssues` (array with 2-4 items)
- ✅ `education` (array with at least 1 item)
- ✅ `experience` (array with at least 1 item)

### Conditional Requirements

- If `isNerd === true`: `nerdReason` must be a non-empty string; `notNerdReason` should be `null`
- If `isNerd === false`: `notNerdReason` must be a non-empty string; `nerdReason` should be `null`
- `website` and `imageUrl` are optional (can be `null`)

### Nerd Score Guidelines

- **90-100**: Advanced degree in STEM/policy + demonstrated application in office; cites research; pushes for evidence-based policy
- **75-89**: Strong technical background OR consistent use of data/research; some policy wins in their domain
- **60-74**: Technical education but sparse evidence of application; mixed record
- **40-59**: Some technical elements but dominant non-technical background; limited data-driven decisions
- **0-39**: Little to no technical background; actively anti-science or anti-evidence positions
- **Fixed 0**: Active opposition to fact-based governance; documented scientific misinformation

## ID Format Convention

Use descriptive ID formats for easy tracking:

- Presidential: `pres-{number}` (e.g., `pres-001`, `pres-002`)
- Senators: `sen-{state_lower}-{number}` (e.g., `sen-ca-001`, `sen-ny-002`)
- House: `rep-{state_lower}-{district}-{number}` (e.g., `rep-ca-12-001`)
- Governors: `gov-{state_lower}-{number}` (e.g., `gov-ca-001`)
- State Senate: `stsen-{state_lower}-{district}-{number}` (e.g., `stsen-ca-11-001`)
- State House: `sthse-{state_lower}-{district}-{number}` (e.g., `sthse-ny-45-001`)
- County: `county-{county_short}-{number}` (e.g., `county-la-001`, `county-cook-001`)

## Adding/Updating Data

1. **Clone the data repository** (or work directly in the submodule):
   ```bash
   git clone https://github.com/iRonJ/ElectNerdsData.git
   ```

2. **Add or edit candidate files** in the appropriate directory

3. **Validate your JSON** to ensure it conforms to the schema above

4. **Commit and push** your changes:
   ```bash
   git add .
   git commit -m "Add/update candidates for {region/office}"
   git push origin main
   ```

5. **Update the main ElectNerds repo** to pull the latest submodule changes:
   ```bash
   cd /path/to/ElectNerds
   cd app/public/data
   git pull origin main
   cd ../../../
   git add app/public/data
   git commit -m "Update data submodule"
   git push
   ```

## Geographic Data Attribution

See `geo/sources.json` for geographic data sources and attribution:
- **States:** US Census Bureau via us-atlas@3 (ISC license)
- **Counties:** US Census Bureau via us-atlas@3 (ISC license)
- **Congressional Districts:** US Census Bureau TIGER files via loganpowell/census-geojson

## Notes

- All file names should use **2-letter state abbreviations** in uppercase (e.g., `CA.json`, `NY.json`, not `california.json`)
- FIPS codes should be **zero-padded** to their full length (2 digits for states, 5 digits for counties)
- The `candidates/` folder **must** contain both `federal/` and `state-local/` subdirectories
- Each state file should be complete (senators, house reps, or all state/local offices), even if empty arrays are needed
- Maintain consistent formatting and ordering within files for easier diffs and reviews

For questions or to contribute, please open an issue at [github.com/iRonJ/ElectNerdsData](https://github.com/iRonJ/ElectNerdsData).
