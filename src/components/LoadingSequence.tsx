import React, { useState, useEffect } from 'react';

export function LoadingSequence({}) {
  const [message, setMessage] = useState("Getting your lesson ready");
  const messages = [
    "Getting your lesson ready",
    "Pulling in your notes",
    "Writing your questions",
    "Almost there"
  ];
  
  useEffect(() => {
    let i = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    const timer = setInterval(() => {
      i = (i + 1) % messages.length;
      setMessage(messages[i]);
    }, 2600);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <style>{`
        :root{
          --pl-navy:#0B1F3A;
          --pl-emerald:#10B981;
          --pl-cyan:#06B6D4;
          --pl-bg:#FFFFFF;
          --pl-muted:#5B6B7F;
          --pl-card-w:132px;
          --pl-card-h:96px;
          --pl-lift:-104px;
          --pl-gutter:5px;
          --pl-cycle:3s;
          --pl-font:"Fredoka",ui-rounded,"SF Pro Rounded","Nunito",system-ui,sans-serif;
        }

        .pl-loader{
          position:fixed;
          inset:0;
          z-index:9999;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          background:var(--pl-bg);
          padding:24px;
          font-family:var(--pl-font);
        }

        .pl-mark{
          font-size:20px;
          font-weight:600;
          letter-spacing:-0.01em;
          color:var(--pl-navy);
          margin:0 0 72px;
        }
        .pl-mark span{color:var(--pl-emerald)}

        .pl-stage{
          position:relative;
          width:var(--pl-card-w);
          height:var(--pl-card-h);
          transform-style:preserve-3d;
        }

        .pl-card{
          position:absolute;
          inset:0;
          border-radius:16px;
          border:2.5px solid var(--pl-navy);
          padding:16px 14px;
          display:flex;
          flex-direction:column;
          justify-content:center;
          gap:8px;
          box-shadow:
            0 0 0 var(--pl-gutter) var(--pl-bg),
            0 10px 22px rgba(11,31,58,0.10);
          transform-origin:50% 120%;
          backface-visibility:hidden;
          animation:pl-shuffle var(--pl-cycle) cubic-bezier(.62,.02,.34,1) infinite;
          will-change:transform;
          background-color: var(--pl-bg);
        }
        .pl-card:nth-child(1){background:var(--pl-emerald);animation-delay:0s}
        .pl-card:nth-child(2){background:var(--pl-cyan);animation-delay:calc(var(--pl-cycle) / -3)}
        .pl-card:nth-child(3){background:var(--pl-bg);animation-delay:calc(var(--pl-cycle) / -3 * 2)}

        .pl-line{height:8px;border-radius:4px;background:var(--pl-navy)}
        .pl-line.w80{width:80%}
        .pl-line.w65{width:65%}
        .pl-line.w55{width:55%}
        .pl-row{display:flex;align-items:center;gap:8px}
        .pl-dot{width:14px;height:14px;border-radius:50%;border:2.5px solid var(--pl-navy);flex:none}
        .pl-dot.fill{background:var(--pl-navy)}

        @keyframes pl-shuffle{
          0%   {transform:translate3d(0,0,4px)                      rotate(-5deg) scale(1)}
          17%  {transform:translate3d(0,var(--pl-lift),4px)         rotate(9deg)  scale(.95)}
          21%  {transform:translate3d(0,var(--pl-lift),-4px)        rotate(7deg)  scale(.94)}
          33%  {transform:translate3d(0,22px,-4px)                  rotate(-8deg) scale(.88)}
          66%  {transform:translate3d(0,11px,0)                     rotate(5deg)  scale(.94)}
          100% {transform:translate3d(0,0,4px)                      rotate(-5deg) scale(1)}
        }

        .pl-status{
          margin:72px 0 0;
          height:1.4em;
          font-size:16px;
          font-weight:400;
          color:var(--pl-muted);
          text-align:center;
          transition: opacity 220ms ease;
        }
        .pl-status b{font-weight:500;color:var(--pl-navy)}

        .pl-sr{
          position:absolute;width:1px;height:1px;padding:0;margin:-1px;
          overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
        }

        @media (max-width:420px){
          :root{--pl-card-w:112px;--pl-card-h:82px;--pl-lift:-90px}
          .pl-mark{margin-bottom:56px}
          .pl-status{margin-top:56px;font-size:15px}
        }

        @media (prefers-reduced-motion:reduce){
          .pl-card{
            animation:pl-settle 2.4s steps(1,end) infinite;
            box-shadow:0 0 0 var(--pl-gutter) var(--pl-bg);
          }
          .pl-card:nth-child(1){transform:translate3d(0,0,4px) rotate(-5deg)}
          .pl-card:nth-child(2){transform:translate3d(0,11px,0) rotate(5deg)}
          .pl-card:nth-child(3){transform:translate3d(0,22px,-4px) rotate(-8deg)}
          @keyframes pl-settle{0%,100%{opacity:1}50%{opacity:.55}}
        }
      `}</style>
      
      <div className="pl-loader" role="status" aria-live="polite">
        <p className="pl-mark"><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Purely</span><span className="text-slate-900">AI</span><span>.</span></p>

        <div className="pl-stage" aria-hidden="true">
          <div className="pl-card">
            <div className="pl-line w80"></div>
            <div className="pl-line w55"></div>
          </div>
          <div className="pl-card">
            <div className="pl-row"><i className="pl-dot fill"></i><span className="pl-line w65"></span></div>
            <div className="pl-row"><i className="pl-dot"></i><span className="pl-line w55"></span></div>
          </div>
          <div className="pl-card">
            <div className="pl-line w80"></div>
            <div className="pl-line w65"></div>
            <div className="pl-line w55"></div>
          </div>
        </div>

        <p className="pl-status" id="pl-status"><b>{message}</b></p>
        <p className="pl-sr">Loading your lesson.</p>
      </div>
    </>
  );
}
