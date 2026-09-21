import type {ReactNode} from 'react';
import {X} from 'lucide-react';

type Props={open:boolean;title:string;description?:string;onClose:()=>void;children:ReactNode;footer?:ReactNode};

export function Modal({open,title,description,onClose,children,footer}:Props){
  if(!open)return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-head"><div><h2 id="modal-title">{title}</h2>{description&&<p className="muted">{description}</p>}</div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18}/></button></div>
      <div className="modal-body">{children}</div>
      {footer&&<div className="modal-foot">{footer}</div>}
    </section>
  </div>;
}
