import React from 'react';
import { UserPlus, FileText, CalendarPlus, Monitor, Phone, Settings } from 'lucide-react';
import { quickActions } from '../data/mockData';

const ICON_MAP = { UserPlus, FileText, CalendarPlus, Monitor, Phone, Settings };

export default function QuickActions({ onToast }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Quick Actions</div>
          <div className="card-subtitle">Common administrative tasks</div>
        </div>
      </div>

      <div className="quick-actions-grid" role="list">
        {quickActions.map(action => {
          const Icon = ICON_MAP[action.icon];
          return (
            <button
              key={action.label}
              className="quick-action-btn"
              role="listitem"
              aria-label={action.label}
              onClick={() => onToast(action.toast, 'info')}
            >
              <Icon size={22} aria-hidden="true" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}