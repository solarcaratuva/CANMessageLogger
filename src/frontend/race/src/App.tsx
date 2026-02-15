import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import Dashboard from "./components/DashboardCard/Dashboard.tsx"
import DataGenerator from './components/DataGenerator/DataGenerator.tsx'
import PullDB from './util/PullDB.tsx'

function App() {
  return (
    <>
      <PullDB />
    </>
  )
}

export default App