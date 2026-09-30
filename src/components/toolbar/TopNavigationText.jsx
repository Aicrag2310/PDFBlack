import React, { useState } from 'react'
import TopNavigation from './TopNavigation'

export default function TopNavigationTest() {
  const [activeSection, setActiveSection] =
    useState('home')

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',

        background: '#111113',
        color: '#ffffff',

        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TopNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div
        style={{
          flex: 1,

          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',

          color: '#a1a1aa',
          fontSize: '16px',
        }}
      >
        Sección seleccionada:{' '}
        <strong
          style={{
            marginLeft: '6px',
            color: '#ffffff',
          }}
        >
          {activeSection}
        </strong>
      </div>
    </div>
  )
}