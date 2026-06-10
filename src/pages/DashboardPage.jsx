import React, { useState, useEffect, useRef, useCallback, useMemo, startTransition, useTransition } from 'react'
import { Chart, registerables } from 'chart.js'
import { getBandColor, getBandClass, fmt } from '../utils/processor.js'
Chart.register(...registerables)
Chart.defaults.color = '#7B98B5'
Chart.defaults.font.family = "'Inter', sans-serif"
Chart.defaults.font.size = 11


/* ══ simple debounce ══ */
function useDebounce(value, delay) {
  const [dv, setDv] = React.useState(value)
  useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t) }, [value, delay])
  return dv
}
/* ══ tiny helpers ══ */
const bc  = (p) => getBandColor(p)
const bcl = (b) => getBandClass(b)
const n   = (x) => (x||0).toLocaleString()
const pf  = (x) => ((x||0).toFixed ? (x||0).toFixed(1) : '0.0') + '%'

function RankBadge({ i }) {
  const cls = i===0?'r1':i===1?'r2':i===2?'r3':''
  return <span className={`rn ${cls}`}>{i+1}</span>
}
function BandChip({ band }) {
  return <span className={`band b${bcl(band)}`}>{band}</span>
}
function PBar({ pct }) {
  return (
    <div className="pb-w">
      <div className="pb"><div className="pb-f" style={{width:`${pct}%`,background:bc(pct)}}></div></div>
      <span className="pb-v" style={{color:bc(pct)}}>{pf(pct)}</span>
    </div>
  )
}

/* ══ Chart hook — lightweight sig, no JSON.stringify on large arrays ══ */
function useChart(id, type, data, options) {
  const ref = useRef(null)
  // cheap signature: length + first + last — avoids serialising 16K rows
  const sig = (() => {
    try {
      const ds = data?.datasets?.[0]; const d = ds?.data
      const len = Array.isArray(d) ? d.length : 0
      const f = len > 0 ? (typeof d[0]==='object' ? d[0].y : d[0]) : 0
      const l = len > 0 ? (typeof d[len-1]==='object' ? d[len-1].y : d[len-1]) : 0
      return id + '|' + len + '|' + f + '|' + l + '|' + (data?.labels?.length ?? 0)
    } catch(e) { return id }
  })()
  useEffect(() => {
    const canvas = document.getElementById(id)
    if (!canvas) return
    const existing = Chart.getChart(id)
    if (existing) existing.destroy()
    ref.current = new Chart(canvas, { type, data, options })
    return () => { if (ref.current) { ref.current.destroy(); ref.current = null } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
}

/* ═════════════════════════ PAGE 1: EXECUTIVE ═════════════════════════ */
function ExecutivePage({ data }) {
  const { state, divisions, districts } = data
  const top10  = districts.slice(0,10)
  const bot10  = [...districts].sort((a,b)=>a.pass_pct-b.pass_pct).slice(0,10)
  const divSorted = [...divisions].sort((a,b)=>b.pass_pct-a.pass_pct)

  /* Charts */
  useChart('top10Chart','bar',
    { labels: top10.map(d=>d.name),
      datasets:[{data:top10.map(d=>d.pass_pct),backgroundColor:top10.map(d=>bc(d.pass_pct)),borderRadius:6,borderSkipped:false}]},
    { indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.raw.toFixed(1)}%`}}},
      scales:{x:{grid:{color:'rgba(26,48,80,.5)'},ticks:{callback:v=>v+'%'}},y:{grid:{display:false},ticks:{font:{size:11,weight:'600'},color:'#C8DFF0'}}}}
  )
  useChart('bot10Chart','bar',
    { labels: bot10.map(d=>d.name),
      datasets:[{data:bot10.map(d=>d.pass_pct),backgroundColor:bot10.map(d=>bc(d.pass_pct)),borderRadius:6,borderSkipped:false}]},
    { indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.raw.toFixed(1)}%`}}},
      scales:{x:{grid:{color:'rgba(26,48,80,.5)'},ticks:{callback:v=>v+'%'}},y:{grid:{display:false},ticks:{font:{size:11,weight:'600'},color:'#C8DFF0'}}}}
  )
  useChart('meritChart','doughnut',
    { labels:['1st Division','2nd Division','3rd Division'],
      datasets:[{data:[state.ist,state.iind,state.iiird],backgroundColor:['#00E676','#00B5E2','#FFC107'],borderWidth:0,hoverOffset:8}]},
    { cutout:'72%', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw.toLocaleString()}`}}}}
  )
  useChart('pvfChart','bar',
    { labels: divSorted.map(d=>d.name),
      datasets:[
        {label:'Passed',data:divSorted.map(d=>d.passed),backgroundColor:'rgba(0,230,118,.7)',borderRadius:4},
        {label:'Failed',data:divSorted.map(d=>d.failed),backgroundColor:'rgba(255,82,82,.7)',borderRadius:4}
      ]},
    { indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{boxWidth:10}}},
      scales:{x:{stacked:true,grid:{color:'rgba(26,48,80,.5)'},ticks:{callback:v=>fmt(v)}},y:{stacked:true,grid:{display:false},ticks:{font:{size:11,weight:'600'}}}}}
  )

  const bestDiv  = divSorted[0]
  const worstDiv = divSorted[divSorted.length-1]
  const bestDist = districts[0]
  const worstDist = [...districts].sort((a,b)=>a.pass_pct-b.pass_pct)[0]

  return (
    <div className="page-body">
      <div className="section-header">
        <div className="eyebrow">Executive Command Center</div>
        <div className="section-title">Statewide Performance Overview</div>
        <div className="section-sub">{n(state.schools)} Schools · {divisions.length} Divisions · {districts.length} Districts</div>
      </div>

      {/* KPI Strip */}
      <div className="grid g5 mb16">
        {[
          ['🏫', n(state.schools), 'Total Schools', '#00B5E2'],
          ['👨‍🎓', n(state.appeared), 'Total Appeared', '#22D3EE'],
          ['✅', n(state.passed), 'Total Passed', '#00E676'],
          ['⚠️', n(state.failed), 'Total Failed', '#FF5252'],
          ['📊', pf(state.pass_pct), 'Overall Pass %', '#FFC107'],
        ].map(([icon, val, label, color]) => (
          <div key={label} className="card kpi" style={{borderTop:`3px solid ${color}`}}>
            <span className="kpi-icon">{icon}</span>
            <div className="kpi-val" style={{color}}>{val}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Division status strip */}
      <div className="state-strip mb16">
        {divSorted.map((d,i) => (
          <div key={d.name} className="ss-item">
            <div className="ss-pct" style={{color:bc(d.pass_pct)}}>{pf(d.pass_pct)}</div>
            <div className="ss-name">{d.name}</div>
            <div className="ss-rank">#{i+1}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid g32 mb16">
        <div className="card">
          <div className="card-head"><span className="card-title">Top {top10.length} Districts</span><span className="card-tag">Pass %</span></div>
          <div className="chart-wrap" style={{height:280}}><canvas id="top10Chart"></canvas></div>
        </div>
        <div className="card">
          <div className="card-head"><span className="card-title">Merit Distribution</span><span className="card-tag">{n(state.passed)} Passed</span></div>
          <div className="dc-wrap" style={{height:210}}>
            <canvas id="meritChart"></canvas>
            <div className="dc-center"><div className="dc-val">{fmt(state.passed)}</div><div className="dc-lbl">Passed</div></div>
          </div>
          <div className="legend-row">
            <span><span style={{color:'#00E676'}}>●</span> 1st {n(state.ist)}</span>
            <span><span style={{color:'#00B5E2'}}>●</span> 2nd {n(state.iind)}</span>
            <span><span style={{color:'#FFC107'}}>●</span> 3rd {n(state.iiird)}</span>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid g32 mb16">
        <div className="card">
          <div className="card-head"><span className="card-title">Bottom {bot10.length} Districts</span><span className="card-tag card-tag-r">⚠ Intervention</span></div>
          <div className="chart-wrap" style={{height:280}}><canvas id="bot10Chart"></canvas></div>
        </div>
        <div className="card">
          <div className="card-head"><span className="card-title">Pass vs Fail by Division</span><span className="card-tag">Stacked</span></div>
          <div className="chart-wrap" style={{height:280}}><canvas id="pvfChart"></canvas></div>
        </div>
      </div>

      {/* Insight */}
      <div className="insight">
        <div className="insight-label">AI Executive Insight</div>
        <div className="insight-text">
          The dataset recorded an overall pass rate of <strong>{pf(state.pass_pct)}</strong> across{' '}
          <strong>{n(state.schools)} schools</strong> and <strong>{n(state.appeared)} students</strong>.{' '}
          <strong>{bestDiv?.name} Division leads at {pf(bestDiv?.pass_pct)}</strong> while{' '}
          <strong>{worstDiv?.name} Division requires intervention at {pf(worstDiv?.pass_pct)}</strong>.{' '}
          Top district: <strong>{bestDist?.name} ({pf(bestDist?.pass_pct)})</strong>.{' '}
          Lowest: <strong>{worstDist?.name} ({pf(worstDist?.pass_pct)})</strong>.{' '}
          {state.ist > 0 && <>{n(Math.round(state.ist/state.passed*100))}% of passed students secured First Division.</>}
        </div>
      </div>
    </div>
  )
}

/* ═════════════════════════ PAGE 2: DIVISION ═════════════════════════ */
function DivisionPage({ data }) {
  const { divisions, districts, bandByDiv, totalByDiv } = data
  const [selDiv, setSelDiv] = useState('ALL')
  const divData = selDiv === 'ALL'
    ? { schools: totalByDiv.ALL, appeared: data.state.appeared, passed: data.state.passed, failed: data.state.failed, pass_pct: data.state.pass_pct }
    : divisions.find(d => d.name === selDiv) || {}
  const divsSorted = [...divisions].sort((a,b) => b.pass_pct - a.pass_pct)
  const filteredDistricts = selDiv === 'ALL'
    ? districts.slice(0,15)
    : districts.filter(d => d.division === selDiv).sort((a,b) => b.pass_pct - a.pass_pct)

  useChart('distChart','bar',
    { labels: filteredDistricts.map(d=>d.name),
      datasets:[{data:filteredDistricts.map(d=>d.pass_pct),backgroundColor:filteredDistricts.map(d=>bc(d.pass_pct)),borderRadius:5,borderSkipped:false}]},
    { indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.raw.toFixed(1)}% · ${n(filteredDistricts[c.dataIndex]?.schools)} schools`}}},
      scales:{x:{grid:{color:'rgba(26,48,80,.5)'},ticks:{callback:v=>v+'%'}},y:{grid:{display:false},ticks:{font:{size:10.5}}}}}
  )

  return (
    <div className="page-body">
      <div className="section-header">
        <div className="eyebrow">Division Intelligence</div>
        <div className="section-title">Division-wise Performance Analysis</div>
        <div className="section-sub">{divisions.length} Divisions · {districts.length} Districts · Source-verified</div>
      </div>

      <div className="slicer-row">
        <div className="sl"><div className="sl-label">Select Division</div>
          <select className="sl-select" value={selDiv} onChange={e=>setSelDiv(e.target.value)}>
            <option value="ALL">All Divisions</option>
            {divsSorted.map(d=><option key={d.name}>{d.name}</option>)}
          </select></div>
      </div>

      {/* Division KPIs */}
      <div className="grid g5 mb16">
        {[
          [n(divData.schools), 'Schools', '#00B5E2'],
          [n(divData.appeared), 'Appeared', '#22D3EE'],
          [n(divData.passed), 'Passed', '#00E676'],
          [n(divData.failed), 'Failed', '#FF5252'],
          [pf(divData.pass_pct), 'Pass %', '#FFC107'],
        ].map(([val,label,color])=>(
          <div key={label} className="card kpi" style={{borderTop:`3px solid ${color}`}}>
            <div className="kpi-val" style={{color,fontSize:24}}>{val}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid g2 mb16">
        {/* Ranking bars */}
        <div className="card">
          <div className="card-head"><span className="card-title">Division Ranking</span><span className="card-tag">Pass %</span></div>
          {divsSorted.map(d=>(
            <div key={d.name} className="dv-row" style={{opacity:selDiv!=='ALL'&&selDiv!==d.name?0.28:1}}>
              <div className="dv-nm">{d.name}</div>
              <div className="dv-bar-wrap">
                <div className="dv-bar-fill" style={{width:`${d.pass_pct}%`,background:bc(d.pass_pct)}}>{pf(d.pass_pct)}</div>
              </div>
              <div className="dv-tag"><BandChip band={d.band}/></div>
            </div>
          ))}
        </div>
        {/* Division table */}
        <div className="card">
          <div className="card-head"><span className="card-title">Division Matrix</span><span className="card-tag">All Divisions</span></div>
          <div className="tbl-wrap">
            <table><thead><tr><th>#</th><th>Division</th><th>Schools</th><th>Appeared</th><th>Passed</th><th>Pass %</th><th>Band</th></tr></thead>
            <tbody>
              {divsSorted.map((d,i)=>(
                <tr key={d.name} style={{opacity:selDiv!=='ALL'&&selDiv!==d.name?0.28:1}}>
                  <td><RankBadge i={i}/></td>
                  <td style={{fontWeight:600,color:'#fff'}}>{d.name}</td>
                  <td>{n(d.schools)}</td><td>{n(d.appeared)}</td>
                  <td style={{color:'var(--success)'}}>{n(d.passed)}</td>
                  <td><PBar pct={d.pass_pct}/></td>
                  <td><BandChip band={d.band}/></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </div>

      <div className="grid g2 mb16">
        {/* District chart */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">District Rankings</span>
            <span className="card-tag">{selDiv==='ALL'?'Top 15':selDiv}</span>
          </div>
          <div className="chart-wrap" style={{height:360}}><canvas id="distChart"></canvas></div>
        </div>
        {/* Treemap */}
        <div className="card">
          <div className="card-head"><span className="card-title">Division Treemap</span><span className="card-tag">Students Appeared</span></div>
          <div className="treemap">
            {[...divisions].sort((a,b)=>b.appeared-a.appeared).map((d,i)=>{
              const cl=bc(d.pass_pct)
              return (
                <div key={d.name}
                  className={`tm ${i===0?'span2':''}`}
                  style={{background:`${cl}18`,borderColor:`${cl}44`,opacity:selDiv!=='ALL'&&selDiv!==d.name?0.22:1}}
                  title={`${d.name}\nAppeared: ${n(d.appeared)}\nPassed: ${n(d.passed)}\nPass %: ${pf(d.pass_pct)}`}
                  onClick={()=>setSelDiv(d.name)}
                >
                  <div className="tm-name">{d.name}</div>
                  <div className="tm-students">{n(d.appeared)} students · {n(d.schools)} schools</div>
                  <div className="tm-pct" style={{color:cl}}>{pf(d.pass_pct)}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═════════════════════════ PAGE 3: SCHOOL ═════════════════════════ */
const BANDS = ['Elite','Excellent','Good','Average','Needs Improvement']
function SchoolPage({ data }) {
  const { schools, divisions, bandByDiv, totalByDiv } = data
  const [selDiv,  setSelDiv]  = useState('ALL')
  const [selBand, setSelBand] = useState('ALL')
  const [queryRaw, setQueryRaw] = useState('')
  const query = useDebounce(queryRaw, 280)
  const [sortKey, setSortKey] = useState('pass_pct')
  const [sortDir, setSortDir] = useState(-1)
  const [page,    setPage]    = useState(0)
  const PAGE_SIZE = 200

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return schools.filter(s => {
      if (selDiv  !== 'ALL' && s.division !== selDiv)  return false
      if (selBand !== 'ALL' && s.band     !== selBand) return false
      if (q && !s.name.toLowerCase().includes(q) && !s.district.toLowerCase().includes(q)) return false
      return true
    }).sort((a,b) => {
      const va = a[sortKey] ?? '', vb = b[sortKey] ?? ''
      return sortDir * (va > vb ? 1 : va < vb ? -1 : 0)
    })
  }, [schools, selDiv, selBand, query, sortKey, sortDir])

  const paginated = filtered.slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const doSort = (k) => { if(sortKey===k) setSortDir(d=>d*-1); else {setSortKey(k);setSortDir(-1)} }

  /* ── Band chart — REAL counts from source ── */
  const realKey = selDiv === 'ALL' ? 'ALL' : selDiv
  const bandCounts = bandByDiv[realKey] || {}
  useChart('bdChart','bar',
    { labels: BANDS,
      datasets:[{label:'Schools (Source Data)',data:BANDS.map(b=>bandCounts[b]||0),
        backgroundColor:['#00E676BB','#22D3EEBB','#00B5E2BB','#FFC107BB','#FF5252BB'],
        borderRadius:8,borderSkipped:false}]},
    { responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${(c.raw||0).toLocaleString()} schools`}}},
      scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(26,48,80,.5)'},ticks:{callback:v=>v.toLocaleString()}}}}
  )

  /* ── Scatter — ALL filtered schools ── */
  const divCols = ['#00E676','#22D3EE','#00B5E2','#A78BFA','#FFC107','#FF5252','#F472B6']
  const scDatasets = selDiv === 'ALL'
    ? divisions.map((d,i) => ({
        label: d.name,
        data: (() => { const pts = filtered.filter(s=>s.division===d.name).map(s=>({x:s.appeared,y:s.pass_pct,name:s.name,district:s.district})); return pts.length > 400 ? pts.filter((_,i)=>i%(Math.ceil(pts.length/400))===0) : pts })(),
        backgroundColor: (divCols[i]||'#94A3B8')+'BB', pointRadius:4, pointHoverRadius:8
      }))
    : [{
        label: selDiv,
        data: (() => { const pts = filtered.map(s=>({x:s.appeared,y:s.pass_pct,name:s.name,district:s.district})); return pts.length > 400 ? pts.filter((_,i)=>i%(Math.ceil(pts.length/400))===0) : pts })(),
        backgroundColor: '#00B5E2BB', pointRadius:4, pointHoverRadius:8
      }]

  useChart('scChart','scatter', { datasets: scDatasets },
    { responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{boxWidth:10}},
        tooltip:{callbacks:{label:c=>`${c.raw.name} (${c.raw.district}): ${c.raw.y.toFixed(1)}% | ${c.raw.x.toLocaleString()} appeared`}}},
      scales:{
        x:{grid:{color:'rgba(26,48,80,.5)'},title:{display:true,text:'Appeared',color:'#7B98B5'},ticks:{callback:v=>fmt(v)}},
        y:{grid:{color:'rgba(26,48,80,.5)'},title:{display:true,text:'Pass %',color:'#7B98B5'},ticks:{callback:v=>v+'%'}}}}
  )

  const reset = () => { setSelDiv('ALL'); setSelBand('ALL'); setQueryRaw(''); setPage(0) }

  return (
    <div className="page-body">
      <div className="section-header">
        <div className="eyebrow">School Intelligence</div>
        <div className="section-title">School-level Exploration</div>
        <div className="section-sub">ALL {n(schools.length)} schools · Every row from your Excel</div>
      </div>

      <div className="slicer-row">
        <div className="sl"><div className="sl-label">Division</div>
          <select className="sl-select" value={selDiv} onChange={e=>{setSelDiv(e.target.value);setPage(0)}}>
            <option value="ALL">All Divisions</option>
            {divisions.map(d=><option key={d.name}>{d.name}</option>)}
          </select></div>
        <div className="sl"><div className="sl-label">Performance Band</div>
          <select className="sl-select" value={selBand} onChange={e=>{setSelBand(e.target.value);setPage(0)}}>
            <option value="ALL">All Bands</option>
            {BANDS.map(b=><option key={b} value={b}>{b}</option>)}
          </select></div>
        <div className="sl"><div className="sl-label">School / District Search</div>
          <input className="sl-input" placeholder="Type to search…" value={queryRaw}
            onChange={e=>{setQueryRaw(e.target.value);setPage(0)}} /></div>
        <div className="sl">
          <button className="btn-ghost sm" onClick={reset} style={{marginTop:20}}>↺ Reset</button></div>
      </div>

      <div className="grid g2 mb16">
        <div className="card">
          <div className="card-head"><span className="card-title">School Performance Scatter</span><span className="card-tag">Appeared vs Pass %</span></div>
          <div className="chart-wrap" style={{height:320}}><canvas id="scChart"></canvas></div>
          <div style={{fontSize:11,color:'var(--dim)',marginTop:6,textAlign:'center'}}>
            Plotting {n(filtered.length)} schools
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <span className="card-title">Band Distribution</span>
            <span className="card-tag">{selDiv==='ALL'?'All Schools':selDiv} · Source Counts</span>
          </div>
          <div className="chart-wrap" style={{height:320}}><canvas id="bdChart"></canvas></div>
          <div style={{fontSize:11,color:'var(--dim)',marginTop:6,textAlign:'center'}}>
            Verified from all {n(totalByDiv[realKey]||0)} source schools
          </div>
        </div>
      </div>

      {/* School table — ALL rows, paginated */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">School Performance Table</span>
          <span className="card-tag">{n(filtered.length)} of {n(schools.length)} schools</span>
        </div>
        <div className="showing-bar">
          <div>
            <strong>Showing rows {n(page*PAGE_SIZE+1)}–{n(Math.min((page+1)*PAGE_SIZE,filtered.length))}</strong>
            {' '}of{' '}<strong>{n(filtered.length)}</strong> filtered
            {filtered.length < schools.length && ` (${n(schools.length)} total)`}
          </div>
          <div style={{fontSize:11,color:'var(--dim)'}}>
            Sorted by {sortKey} {sortDir===-1?'↓':'↑'} · Page {page+1}/{totalPages||1}
          </div>
        </div>
        <div className="tbl-wrap" style={{maxHeight:460}}>
          <table>
            <thead><tr>
              <th onClick={()=>doSort('pass_pct')}>#</th>
              <th onClick={()=>doSort('name')}>School Name</th>
              <th onClick={()=>doSort('district')}>District</th>
              <th onClick={()=>doSort('division')}>Division</th>
              <th onClick={()=>doSort('appeared')}>Appeared</th>
              <th onClick={()=>doSort('passed')}>Passed</th>
              <th onClick={()=>doSort('failed')}>Failed</th>
              <th onClick={()=>doSort('pass_pct')}>Pass %</th>
              <th>Band</th>
            </tr></thead>
            <tbody>
              {paginated.length === 0
                ? <tr><td colSpan={9}><div className="empty"><div className="ei">🔍</div><div className="et">No schools match. Adjust filters.</div></div></td></tr>
                : paginated.map((s,i) => (
                  <tr key={s.code || s.name + i}>
                    <td><RankBadge i={page*PAGE_SIZE+i}/></td>
                    <td className="nm" title={s.name}>{s.name}</td>
                    <td>{s.district}</td><td>{s.division}</td>
                    <td>{n(s.appeared)}</td>
                    <td style={{color:'var(--success)'}}>{n(s.passed)}</td>
                    <td style={{color:'var(--danger)'}}>{n(s.failed)}</td>
                    <td><PBar pct={s.pass_pct}/></td>
                    <td><BandChip band={s.band}/></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <button className="pg-btn" disabled={page===0} onClick={()=>setPage(0)}>«</button>
            <button className="pg-btn" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹ Prev</button>
            <span className="pg-info">Page {page+1} of {totalPages}</span>
            <button className="pg-btn" disabled={page===totalPages-1} onClick={()=>setPage(p=>p+1)}>Next ›</button>
            <button className="pg-btn" disabled={page===totalPages-1} onClick={()=>setPage(totalPages-1)}>»</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═════════════════════════ DASHBOARD SHELL ═════════════════════════ */
export default function DashboardPage({ rawData, onReset }) {
  const [tab, setTab] = useState('exec')

  return (
    <div>
      <nav className="topbar">
        <div className="brand">
          <div className="brand-dot"></div>
          <div>
            <div className="brand-text">INTELLIGENCE PLATFORM</div>
            <div className="brand-sub">{n(rawData.state.schools)} Schools · {rawData.divisions.length} Divisions · {rawData.districts.length} Districts</div>
          </div>
        </div>
        <div className="nav-pills">
          {[['exec','⬛ Executive'],['div','◈ Division Intelligence'],['school','◉ School Intelligence']].map(([id,label])=>(
            <button key={id} className={`nav-pill ${tab===id?'active':''}`} onClick={()=>startTransition(()=>setTab(id))}>{label}</button>
          ))}
        </div>
        <div className="toolbar">
          <span className="live-chip"><span className="live-dot"></span>Live</span>
          <span className="exam-badge">{n(rawData.state.schools)} rows · V1</span>
          <button className="tbtn" onClick={()=>document.documentElement.requestFullscreen?.()}>⛶ Full Screen</button>
          <button className="tbtn" onClick={()=>{document.querySelectorAll('.page-body').forEach(p=>p.style.display='block');window.print();setTimeout(()=>document.querySelectorAll('.page-body').forEach(p=>p.style.display=''),600)}}>⎙ Print</button>
          <button className="tbtn" onClick={onReset}>↩ New File</button>
        </div>
      </nav>
      {tab === 'exec'   && <ExecutivePage data={rawData} />}
      {tab === 'div'    && <DivisionPage  data={rawData} />}
      {tab === 'school' && <SchoolPage    data={rawData} />}
    </div>
  )
}
