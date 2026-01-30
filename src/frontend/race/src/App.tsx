import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import Dashboard from "./components/DashboardCard/Dashboard.tsx"
import DataGenerator from './components/DataGenerator/DataGenerator.tsx'

function App() {
  return (
    <>
      <DataGenerator />
    </>
  )
}

export default App