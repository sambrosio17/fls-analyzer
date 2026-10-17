// OrgFox mascot: a geometric fox head drawn with the brand orange, graphite and fog.
export function Fox({ className = 'fox', title }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <g strokeLinejoin="round" strokeWidth="4">
        <polygon className="f-line" points="18,10 50,34 60,30 70,34 102,10 96,40 110,66 60,106 10,66 24,40" />
        <polygon className="f-o" points="18,10 50,34 24,54" />
        <polygon className="f-o" points="102,10 70,34 96,54" />
        <polygon className="f-d" strokeWidth="2" points="24,22 41,36 27,46" />
        <polygon className="f-d" strokeWidth="2" points="96,22 79,36 93,46" />
        <polygon className="f-o" points="24,40 60,30 96,40 110,66 60,106 10,66" />
        <polygon className="f-w" points="10,66 38,64 60,84 82,64 110,66 60,106" />
        <polygon className="f-n" strokeWidth="3" points="53,97 67,97 60,105" />
      </g>
      <rect className="f-n" x="35" y="52" width="9" height="11" rx="4.5" />
      <rect className="f-n" x="76" y="52" width="9" height="11" rx="4.5" />
      <circle className="f-w" cx="41.5" cy="55" r="1.6" />
      <circle className="f-w" cx="82.5" cy="55" r="1.6" />
    </svg>
  );
}
