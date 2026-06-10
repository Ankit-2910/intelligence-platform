import React, { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { autoDetectColumns, validateMapping } from '../utils/processor.js'

const REQUIRED = ['school_name','appeared','passed','division','district']
const OPTIONAL = ['failed','pass_pct','ist_div','iind_div','iiird_div','sch_code','declared']
const FIELD_LABELS = {
  school_name:'School Name', appeared:'Appeared', passed:'Passed / Pass',
  failed:'Failed', division:'Division', district:'District',
  pass_pct:'Pass % (optional)', ist_div:'1st Division (optional)',
  iind_div:'2nd Division (optional)', iiird_div:'3rd Division (optional)',
  sch_code:'School Code (optional)', declared:'Declared (optional)',
}

export default function UploadPage({ onDataReady }) {
  const [stage, setStage]         = useState('upload')   // upload | mapping | processing
  const [dragging, setDragging]   = useState(false)
  const [headers, setHeaders]     = useState([])
  const [rawRows, setRawRows]     = useState([])
  const [mapping, setMapping]     = useState({})
  const [fileName, setFileName]   = useState('')
  const [error, setError]         = useState('')
  const [progress, setProgress]   = useState('')
  const fileRef = useRef()

  /* ── Parse the Excel file ── */
  const parseExcel = useCallback((file) => {
    setError('')
    setProgress('Reading file…')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        setProgress('Parsing Excel…')
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        if (!rows.length) { setError('File appears empty. Check the sheet.'); setProgress(''); return }

        const hdrs = Object.keys(rows[0])
        const detected = autoDetectColumns(hdrs)
        setHeaders(hdrs)
        setRawRows(rows)
        setMapping(detected)
        setFileName(file.name)
        setProgress('')
        setStage('mapping')
      } catch (err) {
        setError('Could not parse file: ' + err.message)
        setProgress('')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) parseExcel(f)
  }, [parseExcel])

  const handleFile = (e) => { if (e.target.files[0]) parseExcel(e.target.files[0]) }

  /* ── Proceed to dashboard ── */
  const proceed = () => {
    const { valid, missing } = validateMapping(mapping)
    if (!valid) {
      setError(`Map these required columns first: ${missing.map(m => FIELD_LABELS[m]).join(', ')}`)
      return
    }
    setError('')
    setStage('processing')
    setProgress(`Processing ${rawRows.length.toLocaleString()} rows…`)
    setTimeout(() => {
      onDataReady(rawRows, mapping, fileName)
    }, 80)
  }

  /* ─ Upload Screen ─ */
  if (stage === 'upload') return (
    <div className="upload-page">
      <div className="upload-hero">
        <div className="hero-badge">⚡ Intelligence Platform</div>
        <h1 className="hero-title">Paste Excel.<br/>Get Intelligence.</h1>
        <p className="hero-sub">Upload any school results Excel. Every row processed. Full dashboard — instant.</p>
      </div>

      <div
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => fileRef.current.click()}
      >
        <div className="dz-icon">{dragging ? '📂' : '📊'}</div>
        <div className="dz-title">{dragging ? 'Drop it!' : 'Drop your Excel here'}</div>
        <div className="dz-sub">or click to browse · .xlsx / .xls / .csv supported</div>
        {progress && <div className="dz-progress">{progress}</div>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{display:'none'}} />
      </div>

      {error && <div className="error-bar">⚠ {error}</div>}

      <div className="upload-features">
        {[
          ['🔢','All Rows Processed','Every single school — no sampling, no limits'],
          ['🔍','Auto Column Detection','Maps your headers automatically'],
          ['📊','3-Page Dashboard','Executive · Division · School Intelligence'],
          ['⚡','Zero Backend','Runs entirely in your browser'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="feat-card">
            <span className="feat-icon">{icon}</span>
            <div className="feat-title">{title}</div>
            <div className="feat-desc">{desc}</div>
          </div>
        ))}
      </div>

      <div className="try-hint">
        Try it with <strong>10SCHSTT_final.xlsx</strong> — MP Board Class 10, 16,110 schools
      </div>
    </div>
  )

  /* ─ Column Mapping Screen ─ */
  if (stage === 'mapping') {
    const { valid, missing } = validateMapping(mapping)
    return (
      <div className="mapping-page">
        <div className="map-header">
          <div className="map-eyebrow">Step 2 of 2</div>
          <h2 className="map-title">Confirm Column Mapping</h2>
          <p className="map-sub">
            <strong>{fileName}</strong> · {rawRows.length.toLocaleString()} rows · {headers.length} columns detected
          </p>
        </div>

        <div className="map-grid">
          {[...REQUIRED, ...OPTIONAL].map(field => (
            <div key={field} className={`map-row ${REQUIRED.includes(field) ? 'required' : 'optional'}`}>
              <div className="map-label">
                {FIELD_LABELS[field]}
                {REQUIRED.includes(field) && <span className="req-dot">*</span>}
              </div>
              <select
                className="map-select"
                value={mapping[field] || ''}
                onChange={e => setMapping(m => ({ ...m, [field]: e.target.value || null }))}
              >
                <option value="">— not mapped —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              {mapping[field] && (
                <div className="map-preview">
                  eg: "{String(rawRows[0]?.[mapping[field]] ?? '').slice(0,30)}"
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Auto-detected summary */}
        <div className="map-summary">
          <div className="ms-label">Auto-detected:</div>
          {Object.entries(mapping).filter(([,v])=>v).map(([k,v])=>(
            <span key={k} className="ms-chip">{FIELD_LABELS[k]} → <code>{v}</code></span>
          ))}
        </div>

        {error && <div className="error-bar">⚠ {error}</div>}

        <div className="map-actions">
          <button className="btn-ghost" onClick={() => { setStage('upload'); setError('') }}>← Back</button>
          <button
            className={`btn-primary ${!valid ? 'disabled' : ''}`}
            onClick={proceed}
            disabled={!valid}
          >
            {valid
              ? `Build Dashboard → ${rawRows.length.toLocaleString()} rows`
              : `Map required: ${missing.map(m=>FIELD_LABELS[m]).join(', ')}`}
          </button>
        </div>
      </div>
    )
  }

  /* ─ Processing ─ */
  return (
    <div className="processing-page">
      <div className="proc-spinner"></div>
      <div className="proc-title">{progress}</div>
      <div className="proc-sub">Running full aggregations — divisions, districts, bands, rankings…</div>
    </div>
  )
}
