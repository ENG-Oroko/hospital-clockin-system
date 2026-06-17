// src/components/AvatarStack.tsx
import React from 'react'
import { StaffMember } from '../data/types'
import { AVATAR_COLORS } from '../data/departmentsData'

interface Props {
  staff:    StaffMember[]
  maxShow?: number
}

const AvatarStack: React.FC<Props> = ({ staff, maxShow = 5 }) => {
  const visible = staff.slice(0, maxShow)
  const extra   = staff.length - maxShow

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((s, i) => {
        const [bg, color] = AVATAR_COLORS[i % AVATAR_COLORS.length]
        const initials    = s.name
          .split(' ')
          .map(n => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()

        return (
          <div
            key={s.id}
            title={s.name}
            aria-label={s.name}
            style={{
              width:          26,
              height:         26,
              borderRadius:   '50%',
              background:     bg,
              color:          color,
              fontSize:       9,
              fontWeight:     700,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              border:         '2px solid #fff',
              marginLeft:     i === 0 ? 0 : -8,
              flexShrink:     0,
              cursor:         'default',
            }}
          >
            {initials}
          </div>
        )
      })}

      {extra > 0 && (
        <div
          style={{
            width:          26,
            height:         26,
            borderRadius:   '50%',
            background:     '#e5e7eb',
            color:          '#6b7280',
            fontSize:       9,
            fontWeight:     700,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            border:         '2px solid #fff',
            marginLeft:     -8,
            flexShrink:     0,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}

export default AvatarStack