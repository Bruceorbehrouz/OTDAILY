import { useState } from 'react';
import { useSpeech } from 'react-text-to-speech';
import type { Article } from '../../types';
import { copyArticle } from '../../utils/share';
import { Bookmark, Check, Copy, ExternalLink, Pause, Square, Volume2 } from 'lucide-react';
import './ArticleView.css';

interface Props {
  article: Article;
  isBookmarked: boolean;
  onBookmark: () => void;
  savedEnabled: boolean;
  textToSpeechEnabled: boolean;
}

type Tab = 'summary' | 'patients' | 'physios' | 'findings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'patients', label: 'For Patients' },
  { id: 'physios', label: 'For Clinicians' },
  { id: 'findings', label: 'Key Findings' },
];

export function ArticleView({
  article,
  isBookmarked,
  onBookmark,
  savedEnabled,
  textToSpeechEnabled,
}: Props) {
  const [tab, setTab] = useState<Tab>('summary');
  const [copied, setCopied] = useState(false);
  const speechText = [
    article.title,
    `Authors: ${article.authors}.`,
    `Published in ${article.journal}${article.year ? `, ${article.year}` : ''}.`,
    article.summary,
    article.forPatients,
    article.forPhysio,
    `Key findings: ${article.keyFindings.join('. ')}`,
  ].join('\n\n');
  const { speechStatus, start, pause, stop } = useSpeech({
    text: speechText,
    stableText: true,
  });

  function handleCopy() {
    copyArticle(article);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="article-view">
      <div className="article-meta-row">
        {article.studyType && (
          <span className="study-type-badge">{article.studyType}</span>
        )}
        <div className="article-actions">
          {savedEnabled && (
            <button
              className={`action-btn${isBookmarked ? ' bookmarked' : ''}`}
              onClick={onBookmark}
              title={isBookmarked ? 'Remove bookmark' : 'Save article'}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Save article'}
            >
              <Bookmark aria-hidden="true" fill={isBookmarked ? 'currentColor' : 'none'} />
              <span>{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
          )}
          <button className="action-btn" onClick={handleCopy} title="Copy article">
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          {textToSpeechEnabled && (
            <div className="speech-actions" aria-label="Text to speech controls">
              {speechStatus !== 'started' ? (
                <button className="action-btn" onClick={start} title="Read article aloud">
                  <Volume2 aria-hidden="true" />
                  <span>Listen</span>
                </button>
              ) : (
                <button className="action-btn" onClick={pause} title="Pause reading">
                  <Pause aria-hidden="true" />
                  <span>Pause</span>
                </button>
              )}
              <button className="action-btn" onClick={stop} title="Stop reading">
                <Square aria-hidden="true" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <h2 className="article-title">{article.title}</h2>

      <div className="article-byline">
        <span className="article-authors">{article.authors}</span>
        <span className="article-journal">
          {article.journal}
          {article.year ? `, ${article.year}` : ''}
        </span>
        {article.doiUrl && (
          <a href={article.doiUrl} target="_blank" rel="noopener noreferrer" className="article-doi">
            View paper <ExternalLink aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="article-tabs" role="tablist">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`article-tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="article-body" role="tabpanel">
        {tab === 'summary' && (
          <p className="article-text">{article.summary}</p>
        )}
        {tab === 'patients' && (
          <p className="article-text">{article.forPatients}</p>
        )}
        {tab === 'physios' && (
          <p className="article-text">{article.forPhysio}</p>
        )}
        {tab === 'findings' && (
          <ul className="findings-list">
            {article.keyFindings.map((f, i) => (
              <li key={i} className="finding-item">
                <span className="finding-dot" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="article-disclaimer">
        Research summaries are AI-generated and reviewed. Always consult a qualified occupational therapy practitioner for clinical decisions.
      </p>
    </div>
  );
}
