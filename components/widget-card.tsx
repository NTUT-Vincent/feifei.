import { ArrowLeft, ArrowRight, ArrowUpRight, GripVertical, Pencil, Play, Trash2 } from "lucide-react";
import type { CSSProperties, DragEvent } from "react";
import { boards, widgetCatalog } from "../lib/catalog";
import type { Widget } from "../lib/settings";
import { SiteIcon } from "./icons";

type CardProps = {
  widget: Widget;
  editing: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onPlay: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onMove: (direction: number) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
};

export function WidgetCard({
  widget, editing, canMoveLeft, canMoveRight, dragging, dropTarget,
  onPlay, onEdit, onRemove, onMove, onDragStart, onDragEnd, onDragOver, onDrop,
}: CardProps) {
  const { type, title, width } = widget;
  const service = widgetCatalog[type];

  return (
    <article
      className={`widget widget-${type}`}
      style={{ "--span": width } as CSSProperties}
      aria-label={title}
      data-dragging={dragging || undefined}
      data-drop-target={dropTarget || undefined}
      onDragOver={editing ? onDragOver : undefined}
      onDrop={editing ? onDrop : undefined}
    >
      <header className="widget-header">
        <span className={`service-icon ${type}`}><SiteIcon icon={type} size={16} /></span>
        <span className="service-name">{service.name}</span>
        {editing ? (
          <button type="button" className="icon-button drag-handle" draggable aria-label={`拖曳 ${title}`} title="拖曳排序" onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <GripVertical size={18} />
          </button>
        ) : (
          <a className="icon-button" href={widget.url} target="_blank" rel="noopener noreferrer" aria-label={`在 ${service.name} 開啟 ${title}`}><ArrowUpRight size={18} /></a>
        )}
      </header>
      {type === "ptt" ? (
        <ul className="board-list">
          {boards.map((board) => <li key={board.title}>
            <a href={board.url} target="_blank" rel="noopener noreferrer">{board.title}<ArrowUpRight size={15} /></a>
          </li>)}
        </ul>
      ) : (
        <button type="button" className={`media-cover cover-${type}`} disabled={editing} onClick={onPlay} aria-label={`播放 ${title}`}>
          <span className="cover-decoration" aria-hidden><i /><i /><i /></span>
          <span className="cover-play" aria-hidden><Play size={17} fill="currentColor" /></span>
        </button>
      )}
      <div className="widget-caption"><h3>{title}</h3></div>
      {editing && <div className="widget-edit-actions">
        <button type="button" className="icon-button" disabled={!canMoveLeft} aria-label={`${title} 往前移`} onClick={() => onMove(-1)}><ArrowLeft size={16} /></button>
        <button type="button" className="icon-button" disabled={!canMoveRight} aria-label={`${title} 往後移`} onClick={() => onMove(1)}><ArrowRight size={16} /></button>
        <button type="button" className="icon-button" aria-label={`編輯 ${title}`} onClick={onEdit}><Pencil size={15} /></button>
        <button type="button" className="icon-button delete-button" aria-label={`移除 ${title}`} onClick={onRemove}><Trash2 size={16} /></button>
      </div>}
    </article>
  );
}
