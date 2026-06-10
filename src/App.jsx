import React, { useState, useCallback } from 'react'
import UploadPage   from './pages/UploadPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import { processData } from './utils/processor.js'

export default function App() {
  const [state, setState] = useState('upload')   // upload | dashboard
  const [dashData, setDashData] = useState(null)

  const handleDataReady = useCallback((rawRows, colMap, fileName) => {
    const processed = processData(rawRows, colMap)
    setDashData({ ...processed, fileName })
    setState('dashboard')
  }, [])

  const handleReset = useCallback(() => {
    setDashData(null)
    setState('upload')
  }, [])

  if (state === 'dashboard' && dashData) {
    return <DashboardPage rawData={dashData} onReset={handleReset} />
  }
  return <UploadPage onDataReady={handleDataReady} />
}
