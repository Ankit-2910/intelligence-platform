/* ═══════════════════════════════════════════════════════════
   processor.js  —  Intelligence Platform Data Engine
   Handles ANY Excel with school/result data.
   Processes EVERY row — no sampling, no limits.
   ═══════════════════════════════════════════════════════════ */

/* ── Auto-detect columns from header row ── */
export function autoDetectColumns(headers) {
  const h = headers.map(s => String(s).toLowerCase().trim())
  const find = (patterns) => {
    for (const p of patterns) {
      const idx = h.findIndex(x => x.includes(p))
      if (idx !== -1) return headers[idx]
    }
    return null
  }
  return {
    school_name : find(['sch_nm','school name','school','vidyalaya','name of school','संस्था']),
    appeared    : find(['appeared','total appeared','appear','registered','enrollment']),
    passed      : find(['totalpass','total pass','passed','total_pass','pass','उत्तीर्ण']),
    failed      : find(['fail','failed','total fail','अनुत्तीर्ण']),
    division    : find(['division_name','division','div','संभाग']),
    district    : find(['district_name','district','dist','जिला']),
    pass_pct    : find(['passper','pass%','pass %','pass percentage','passpct','% pass']),
    ist_div     : find(['ist_div','1st div','first div','first division','1st division']),
    iind_div    : find(['iind_div','2nd div','second div','second division','2nd division']),
    iiird_div   : find(['iiird_div','3rd div','third div','third division','3rd division']),
    sch_code    : find(['sch_code','school code','code','id','school id']),
    declared    : find(['declared','total declared']),
  }
}

/* ── Validate that minimum required columns are mapped ── */
export function validateMapping(map) {
  const required = ['school_name','appeared','passed','division','district']
  const missing = required.filter(k => !map[k])
  return { valid: missing.length === 0, missing }
}

/* ── Band classification ── */
export function getBand(pct) {
  if (pct >= 90) return 'Elite'
  if (pct >= 80) return 'Excellent'
  if (pct >= 70) return 'Good'
  if (pct >= 60) return 'Average'
  return 'Needs Improvement'
}

export function getBandColor(pct) {
  if (pct >= 90) return '#00E676'
  if (pct >= 80) return '#22D3EE'
  if (pct >= 70) return '#00B5E2'
  if (pct >= 60) return '#FFC107'
  return '#FF5252'
}

export function getBandClass(b) {
  return b === 'Needs Improvement' ? 'Needs' : b
}

/* ── Main processing engine — runs on ALL rows ── */
export function processData(rawRows, colMap) {
  const BANDS = ['Elite','Excellent','Good','Average','Needs Improvement']

  /* ─ Normalize all rows ─ */
  const schools = rawRows
    .filter(r => {
      const app = parseFloat(r[colMap.appeared]) || 0
      return app > 0
    })
    .map(r => {
      const appeared = parseFloat(r[colMap.appeared]) || 0
      const passed   = parseFloat(r[colMap.passed])   || 0
      const failed   = parseFloat(r[colMap.failed])   || 0
      const ist      = parseFloat(r[colMap.ist_div])  || 0
      const iind     = parseFloat(r[colMap.iind_div]) || 0
      const iiird    = parseFloat(r[colMap.iiird_div])|| 0
      const division = String(r[colMap.division] || '').trim().toUpperCase() || 'UNKNOWN'
      const district = String(r[colMap.district] || '').trim().toUpperCase() || 'UNKNOWN'
      const name     = String(r[colMap.school_name] || '').trim()
      const code     = colMap.sch_code ? String(r[colMap.sch_code] || '') : ''

      /* pass% — use source column if available, else compute */
      let pass_pct = colMap.pass_pct
        ? (parseFloat(r[colMap.pass_pct]) || 0)
        : parseFloat((appeared > 0 ? passed / appeared * 100 : 0).toFixed(2))

      /* normalise: if source stores as 0.73 instead of 73 */
      if (pass_pct > 0 && pass_pct <= 1) pass_pct = parseFloat((pass_pct * 100).toFixed(2))
      pass_pct = parseFloat(pass_pct.toFixed(2))

      return { code, name, district, division, appeared, passed, failed, ist, iind, iiird, pass_pct, band: getBand(pass_pct) }
    })

  /* ─ State totals ─ */
  const state = {
    schools   : schools.length,
    appeared  : schools.reduce((s, r) => s + r.appeared, 0),
    passed    : schools.reduce((s, r) => s + r.passed,   0),
    failed    : schools.reduce((s, r) => s + r.failed,   0),
    ist       : schools.reduce((s, r) => s + r.ist,      0),
    iind      : schools.reduce((s, r) => s + r.iind,     0),
    iiird     : schools.reduce((s, r) => s + r.iiird,    0),
  }
  state.pass_pct = state.appeared > 0
    ? parseFloat((state.passed / state.appeared * 100).toFixed(2)) : 0

  /* ─ Aggregate helper ─ */
  function aggregate(rows) {
    const app = rows.reduce((s,r)=>s+r.appeared,0)
    const pas = rows.reduce((s,r)=>s+r.passed,  0)
    const fai = rows.reduce((s,r)=>s+r.failed,  0)
    const ist = rows.reduce((s,r)=>s+r.ist,     0)
    const iind= rows.reduce((s,r)=>s+r.iind,    0)
    const iiird=rows.reduce((s,r)=>s+r.iiird,   0)
    const pct = app>0 ? parseFloat((pas/app*100).toFixed(2)) : 0
    return { schools:rows.length, appeared:app, passed:pas, failed:fai, ist, iind, iiird, pass_pct:pct, band:getBand(pct) }
  }

  /* ─ Divisions ─ */
  const divMap = {}
  schools.forEach(s => {
    if (!divMap[s.division]) divMap[s.division] = []
    divMap[s.division].push(s)
  })
  const divisions = Object.entries(divMap)
    .map(([name, rows]) => ({ name, ...aggregate(rows) }))
    .sort((a, b) => b.pass_pct - a.pass_pct)
    .map((d, i) => ({ ...d, rank: i + 1 }))

  /* ─ Districts ─ */
  const distMap = {}
  schools.forEach(s => {
    const key = `${s.district}|||${s.division}`
    if (!distMap[key]) distMap[key] = []
    distMap[key].push(s)
  })
  const districts = Object.entries(distMap)
    .map(([key, rows]) => {
      const [name, division] = key.split('|||')
      return { name, division, ...aggregate(rows) }
    })
    .sort((a, b) => b.pass_pct - a.pass_pct)
    .map((d, i) => ({ ...d, rank: i + 1 }))

  /* ─ Band distribution per division ─ */
  const bandByDiv = { ALL: {} }
  BANDS.forEach(b => { bandByDiv.ALL[b] = 0 })
  schools.forEach(s => { bandByDiv.ALL[s.band]++ })

  divisions.forEach(div => {
    bandByDiv[div.name] = {}
    BANDS.forEach(b => { bandByDiv[div.name][b] = 0 })
    divMap[div.name].forEach(s => { bandByDiv[div.name][s.band]++ })
  })

  /* ─ Total counts per division ─ */
  const totalByDiv = { ALL: schools.length }
  divisions.forEach(d => { totalByDiv[d.name] = d.schools })

  return { schools, state, divisions, districts, bandByDiv, totalByDiv }
}

/* ── Format numbers nicely ── */
export function fmt(n) {
  if (n >= 1e6)  return (n/1e6).toFixed(1) + 'M'
  if (n >= 1e5)  return (n/1e5).toFixed(1) + 'L'   // Indian lakh
  if (n >= 1e3)  return (n/1e3).toFixed(0) + 'K'
  return String(n)
}
