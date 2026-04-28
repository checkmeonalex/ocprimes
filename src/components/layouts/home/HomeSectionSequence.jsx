'use client'

import { Children } from 'react'

export default function HomeSectionSequence({ children }) {
  const sections = Children.toArray(children)

  return sections.map((section, index) => (
    <div key={`home-sequence-${index}`}>
      {section}
    </div>
  ))
}
