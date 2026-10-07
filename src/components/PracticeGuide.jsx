import { ArrowRight, BookOpen, ChevronRight } from "lucide-react";
import { nextPracticeStep } from "../lib/practice.js";

const STEPS = [
  [
    "requirements",
    "Talabni o‘qing",
    "Nima qanday ishlashi kerakligini biling.",
  ],
  [
    "checklist",
    "Tekshiruvni rejalang",
    "Checklist va takrorlanadigan test-case yozing.",
  ],
  [
    "shop",
    "Do‘konda bajaring",
    "Kutilgan natijani amaldagi natija bilan solishtiring.",
  ],
  [
    "reports",
    "Xatoni hujjatlashtiring",
    "Qadamlar, natija va screenshot bilan report yozing.",
  ],
  [
    "review",
    "Qayta tekshiring",
    "Tuzatilgan build’da retest va yakuniy xulosa qiling.",
  ],
];

export default function PracticeGuide({ session, navigate }) {
  const next = nextPracticeStep(session);
  return (
    <section
      className="practice-guide panel"
      aria-label="Mashq bo‘yicha yo‘l-yo‘riq"
    >
      <div className="practice-next">
        <span className="practice-next-icon">
          <BookOpen size={21} />
        </span>
        <div>
          <span className="practice-caption">Keyingi qadam</span>
          <h2>{next.title}</h2>
          <p>{next.description}</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(next.target)}
        >
          {next.action} <ArrowRight size={15} />
        </button>
      </div>
      <details className="practice-roadmap">
        <summary>Mashqning 5 bosqichi</summary>
        <ol>
          {STEPS.map(([target, title, description], index) => (
            <li key={target}>
              <button onClick={() => navigate(target)}>
                <span className="practice-step-number">{index + 1}</span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
