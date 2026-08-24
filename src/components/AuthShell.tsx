import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * The frame every account screen sits in.
 *
 * Deliberately plain. A sign-in page is a door, not a destination — the fewer
 * decisions between arriving and being through it, the better it works.
 */
export function AuthShell({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="authwrap">
      <div className="authcard">
        <Link className="authmark" to="/welcome" aria-label="Shorebound">
          <img src="/assets/icon-mark.svg" alt="" width={40} height={40} />
          <span>
            <b>Shorebound</b>
            <em>Go Fish Yo&rsquo;Self &ndash; Florida Gulf Coast</em>
          </span>
        </Link>
        <h1>{title}</h1>
        {lede && <p className="authlede">{lede}</p>}
        {children}
        {footer && <div className="authfoot">{footer}</div>}
      </div>
    </div>
  );
}

/** One consistent place for the result of a submit: never a silent no-op. */
export function AuthNote({ tone, children }: { tone: 'bad' | 'good'; children: ReactNode }) {
  return (
    <p className={`authnote authnote-${tone}`} role={tone === 'bad' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export function Field({
  id,
  label,
  hint,
  ...input
}: {
  id: string;
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="authfield">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      {hint && (
        <span className="authhint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}
