"use client";

import { useState } from "react";
import changelogData from "@/lib/changelog.json";

interface Commit {
  hash: string;
  date: string;
  subject: string;
}

interface Version {
  version: string;
  date: string;
  commits: Commit[];
}

const changelog = changelogData as Version[];

function getCommitType(subject: string): { label: string; className: string } {
  const sub = subject.toLowerCase();
  
  if (
    sub.startsWith("added") || 
    sub.startsWith("created") || 
    sub.startsWith("setup") || 
    sub.startsWith("implementato") ||
    sub.startsWith("aggiunto") ||
    sub.startsWith("nuovo")
  ) {
    return { label: "Nuovo", className: "new" };
  }
  
  if (
    sub.startsWith("fixed") || 
    sub.startsWith("resolved") || 
    sub.startsWith("fix") || 
    sub.includes("bug") ||
    sub.includes("error") || 
    sub.includes("corretto") ||
    sub.includes("risolto")
  ) {
    return { label: "Fix", className: "fix" };
  }
  
  if (
    sub.startsWith("improved") || 
    sub.startsWith("optimised") || 
    sub.startsWith("optimized") || 
    sub.startsWith("refactoring") || 
    sub.startsWith("changed") || 
    sub.startsWith("update") || 
    sub.startsWith("raised") || 
    sub.startsWith("reduced") || 
    sub.includes("perf") ||
    sub.includes("migliorato") ||
    sub.includes("ottimizzato")
  ) {
    return { label: "Miglioramento", className: "improvement" };
  }
  
  return { label: "Altro", className: "other" };
}

export function ChangelogList() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChangelog = changelog
    .map((v) => {
      const filteredCommits = v.commits.filter(
        (c) =>
          c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.version.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...v, commits: filteredCommits };
    })
    .filter((v) => v.commits.length > 0);

  return (
    <div className="changelog-container">
      <div className="changelog-search-wrapper">
        <input
          type="text"
          placeholder="Cerca modifiche o versioni (es. 'mappa', '1.19')..."
          className="changelog-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="btn secondary"
            style={{
              padding: "0 16px",
              borderRadius: "14px",
              fontSize: "0.88rem",
              height: "auto",
              minHeight: "initial",
              border: "1px solid var(--border)"
            }}
          >
            Cancella
          </button>
        )}
      </div>

      {filteredChangelog.length === 0 ? (
        <div className="changelog-no-results">
          Nessuna modifica trovata per &ldquo;<strong>{searchQuery}</strong>&rdquo;. Prova con un&apos;altra parola chiave.
        </div>
      ) : (
        <div className="changelog-timeline">
          {filteredChangelog.map((versionBlock) => (
            <div key={versionBlock.version} className="changelog-version-block">
              <div className="changelog-version-card">
                <div className="changelog-version-header">
                  <div className="changelog-version-title">
                    <span className="changelog-version-number">v{versionBlock.version}</span>
                  </div>
                  <span className="changelog-version-date">
                    {new Date(versionBlock.date).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </span>
                </div>
                
                <div className="changelog-commits-list">
                  {versionBlock.commits.map((commit) => {
                    const commitType = getCommitType(commit.subject);
                    return (
                      <div key={commit.hash} className="changelog-commit-item">
                        <span className={`changelog-badge ${commitType.className}`}>
                          {commitType.label}
                        </span>
                        <span className="changelog-commit-text">{commit.subject}</span>
                        <span className="changelog-commit-hash" title={commit.hash}>
                          {commit.hash}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
