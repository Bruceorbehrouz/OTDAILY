import { FEATURES } from '../../config/features';
import './AboutView.css';

export function AboutView() {
  return (
    <div className="about-view">
      <h2 className="about-title">About OT Research Daily</h2>

      <p className="about-lead">
        OT Research Daily brings evidence-based research to occupational therapists in a format
        that's quick to read and easy to apply.
      </p>

      <div className="about-section">
        <h3 className="about-section-title">Daily Article</h3>
        <p>
          Each day a new peer-reviewed research article is selected, summarised in plain language,
          and presented with perspectives for patients and clinicians alike.
        </p>
      </div>

      {FEATURES.wordle && (
        <div className="about-section">
          <h3 className="about-section-title">Wordle</h3>
          <p>
            A daily anatomy word game. Guess the 5-letter clinical or anatomy term in 6 tries.
            The word changes every day based on a fixed rotation of 100+ terms.
          </p>
        </div>
      )}

      {FEATURES.crossword && (
        <div className="about-section">
          <h3 className="about-section-title">Crossword</h3>
          <p>
            A weekly anatomy-themed crossword puzzle. Progress is saved automatically so you can
            return and finish at any time. A new puzzle appears each week.
          </p>
        </div>
      )}

      <div className="about-section">
        <h3 className="about-section-title">Disclaimer</h3>
        <p className="about-disclaimer">
          Research summaries are AI-assisted and reviewed. They are intended for educational
          purposes only. Always consult a qualified occupational therapy practitioner for
          clinical decisions.
        </p>
      </div>
    </div>
  );
}
