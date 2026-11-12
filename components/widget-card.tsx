import { ArrowLeft, ArrowRight, ArrowUpRight, GripVertical, Pencil, Play, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import { boards, widgetCatalog } from "../lib/catalog";
import type { Widget } from "../lib/settings";
import { MediaPicker } from "./media-picker";
import { YouTubePlayer } from "./youtube-player";
import { nextIndex } from "../lib/media";
import { SiteIcon } from "./icons";

const MediaPlayer = dynamic(() => import("./media-player").then((module) => module.MediaPlayer));

type CardProps = {
  widget: Widget;
  expanded: boolean;
  onExpand: (open: boolean) => void;
  onChange: (patch: Partial<Widget>) => void;
  editing: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMove: (direction: number) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
};

export function WidgetCard({
  widget, expanded, onExpand: setExpanded, onChange, editing, canMoveLeft, canMoveRight, dragging, dropTarget,
  onEdit, onRemove, onMove, onDragStart, onDragEnd, onDragOver, onDrop,
}: CardProps) {
  const { type, title, width } = widget;
  const service = widgetCatalog[type];
  const [choosing, setChoosing] = useState(false);
  const queue = widget.queue ?? [];
  function advance(direction: number) {
    const index = queue.findIndex((item) => item.url === widget.url);
    const next = direction < 0 ? (index > 0 ? index - 1 : widget.loop ? queue.length - 1 : null) : nextIndex(index, queue.length, Boolean(widget.shuffle), Boolean(widget.loop));
    if (next !== null && queue[next]) onChange({ url: queue[next].url, title: queue[next].title.slice(0, 40) });
  }
  const restoreFocus = useRef(false);

  return (
    <article
      className={`widget widget-${type}`}
      style={{ "--span": expanded && type === "twitch" ? Math.max(2, width) : width } as CSSProperties}
      aria-label={title}
      data-dragging={dragging || undefined}
      data-drop-target={dropTarget || undefined}
      onDragOver={editing ? onDragOver : undefined}
      onDrop={editing ? onDrop : undefined}
    >
      <header className="widget-header">
        <span className={`service-icon ${type}`}><SiteIcon icon={type} size={16} /></span>
        <span className="service-name">{service.name}</span>
        {expanded && (
          <button type="button" className="icon-button collapse-player" aria-label={`收起 ${title}`} onClick={() => {
            restoreFocus.current = true;
            setExpanded(false);
          }}><X size={17} /></button>
        )}
        {editing ? (
          <button type="button" className="icon-button drag-handle" draggable aria-label={`拖曳 ${title}`} title="拖曳排序" onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <GripVertical size={18} />
          </button>
        ) : !expanded && (
          <a className="icon-button" href={widget.url} target="_blank" rel="noopener noreferrer" aria-label={`在 ${service.name} 開啟 ${title}`}><ArrowUpRight size={18} /></a>
        )}
      </header>
      {type === "ptt" ? (
        <ul className="board-list">
          {boards.map((board) => <li key={board.title}>
            <a href={board.url} target="_blank" rel="noopener noreferrer">{board.title}<ArrowUpRight size={15} /></a>
          </li>)}
        </ul>
      ) : expanded ? (
        <div className="inline-player">{type === "youtube" ? <YouTubePlayer url={widget.url} shuffle={Boolean(widget.shuffle)} loop={Boolean(widget.loop)} onShuffle={() => onChange({ shuffle: !widget.shuffle })} onLoop={() => onChange({ loop: !widget.loop })} onNext={() => advance(1)} onPrevious={() => advance(-1)} hasQueue={queue.length > 0} /> : <MediaPlayer key={widget.url} provider={type} url={widget.url} title={title} />}</div>
      ) : (
        <button ref={(element) => {
          if (element && restoreFocus.current) {
            restoreFocus.current = false;
            element.focus();
          }
        }} type="button" className={`media-cover cover-${type}`} disabled={editing} onClick={() => setExpanded(true)} aria-label={`播放 ${title}`}>
          <span className="cover-decoration" aria-hidden><i /><i /><i /></span>
          <span className="cover-play" aria-hidden><Play size={17} fill="currentColor" /></span>
        </button>
      )}
      <div className="widget-caption"><h3>{title}</h3>{type !== "ptt" && <button className="plain-button change-content" aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>{choosing ? "收起設定" : "換內容"}</button>}</div>
      {choosing && type !== "ptt" && <MediaPicker widget={widget} onChange={onChange} onPlay={() => setExpanded(true)} />}
      {editing && <div className="widget-edit-actions">
        <button type="button" className="icon-button" disabled={!canMoveLeft} aria-label={`${title} 往前移`} onClick={() => onMove(-1)}><ArrowLeft size={16} /></button>
        <button type="button" className="icon-button" disabled={!canMoveRight} aria-label={`${title} 往後移`} onClick={() => onMove(1)}><ArrowRight size={16} /></button>
        <button type="button" className="icon-button" aria-label={`編輯 ${title}`} onClick={onEdit}><Pencil size={15} /></button>
        <button type="button" className="icon-button delete-button" aria-label={`移除 ${title}`} onClick={onRemove}><Trash2 size={16} /></button>
      </div>}
    </article>
  );
}
