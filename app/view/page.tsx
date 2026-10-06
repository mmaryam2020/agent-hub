'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Card {
  title: string;
  status?: 'active' | 'pending' | 'in-progress' | 'done';
  details: string[];
}

interface NavSection {
  id: string;
  label: string;
}

interface DashboardData {
  title: string;
  subtitle?: string;
  navigation: NavSection[];
  content: {
    [key: string]: {
      cards: Card[];
    };
  };
}

function VaultViewerContent() {
  const searchParams = useSearchParams();
  const dataUrl = searchParams.get('url');

  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch the uploaded JSON blob from Vercel Storage
  useEffect(() => {
    if (!dataUrl) {
      setError('No vault URL provided. Please pass ?url=<JSON_URL> in the query string.');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/blob-proxy?url=${encodeURIComponent(dataUrl)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then((payload: any) => {
        // Detect format
        let parsedData: DashboardData;

        if (payload.report === 'workout' && payload.sessions && payload.physio_routine) {
          // Map workout report JSON format to standard DashboardData format dynamically
          const navigation: NavSection[] = [
            { id: 'sessions', label: `Sessions (${payload.sessions.length})` },
            { id: 'routine', label: 'Physio Routine' }
          ];

          const sessionCards: Card[] = payload.sessions.map((session: any) => {
            const details: string[] = [];
            if (session.duration_min) details.push(`Duration: ${session.duration_min} minutes`);
            if (session.distance_km) details.push(`Distance: ${session.distance_km} km`);
            if (session.pace) details.push(`Pace: ${session.pace}`);
            if (session.notes) details.push(`Notes: ${session.notes}`);
            
            return {
              title: `${session.type} (${session.date})`,
              status: 'done',
              details
            };
          });

          const routineCards: Card[] = [
            {
              title: `Physio Exercises (Frequency: ${payload.physio_routine.frequency || 'regular'})`,
              status: 'active',
              details: payload.physio_routine.exercises || []
            }
          ];

          parsedData = {
            title: `Moka Workout & Physio Vault`,
            subtitle: `Generated: ${payload.generated || ''} • Period: ${payload.period || ''}`,
            navigation,
            content: {
              sessions: { cards: sessionCards },
              routine: { cards: routineCards }
            }
          };
        } else {
          // Standard DashboardData format
          parsedData = payload as DashboardData;
        }

        setData(parsedData);
        if (parsedData.navigation.length > 0) {
          setActiveTab(parsedData.navigation[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load dashboard data from vault.');
        setLoading(false);
      });
  }, [dataUrl]);

  if (loading) {
    return (
      <div className="moka-spinner-container">
        <div className="moka-spinner-inner">
          <div className="moka-spinner"></div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Fetching Moka Vault...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="moka-error-container">
        <div className="moka-error-card">
          <span className="moka-error-icon">⚠️</span>
          <h2 className="moka-error-title">Failed to load vault</h2>
          <p className="moka-error-msg">{error}</p>
          <a href="/" className="moka-btn-primary">
            Go Back
          </a>
        </div>
      </div>
    );
  }

  // Real-time search filter for cards
  const cards = data.content[activeTab]?.cards || [];
  const filteredCards = cards.filter((card) => {
    const matchesTitle = card.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDetails = card.details.some((detail) =>
      detail.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesTitle || matchesDetails;
  });

  return (
    <div className="moka-view-container">
      {/* Header Container */}
      <header className="moka-header">
        <div className="moka-title-group">
          <h1>{data.title}</h1>
          {data.subtitle && <p>{data.subtitle}</p>}
        </div>

        {/* Moka Search Filename Style Input Box */}
        <div className="moka-search-wrapper">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="moka-search-input"
          />
        </div>
      </header>

      {/* Tabs Navigation */}
      {data.navigation.length > 0 && (
        <div className="moka-nav-wrapper">
          <nav className="moka-nav">
            {data.navigation.map((nav) => {
              const isActive = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => {
                    setActiveTab(nav.id);
                    setSearchQuery(''); // Reset search when switching tabs
                  }}
                  className={`moka-nav-btn ${isActive ? 'active' : ''}`}
                >
                  {nav.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Grid */}
      <main className="moka-main">
        {filteredCards.length > 0 ? (
          <div className="moka-grid">
            {filteredCards.map((card, index) => (
              <div key={index} className="moka-card">
                <div>
                  <div className="moka-card-header">
                    <h3 className="moka-card-title">{card.title}</h3>
                    {card.status && (
                      <span className={`moka-status-badge ${card.status}`}>
                        {card.status}
                      </span>
                    )}
                  </div>
                  <ul className="moka-details-list">
                    {card.details.map((detail, idx) => (
                      <li key={idx} className="moka-detail-item">
                        <span className="moka-detail-bullet">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="moka-empty-state">
            {searchQuery ? 'No matching cards found.' : 'No entries available under this category.'}
          </div>
        )}
      </main>
    </div>
  );
}

export default function VaultViewer() {
  return (
    <Suspense fallback={
      <div className="moka-spinner-container">
        <div className="moka-spinner-inner">
          <div className="moka-spinner"></div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Preparing Vault...</p>
        </div>
      </div>
    }>
      <VaultViewerContent />
    </Suspense>
  );
}
