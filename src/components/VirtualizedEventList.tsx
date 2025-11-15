import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { EventCard } from './EventCard';
import type { Event } from '../types';

interface VirtualizedEventListProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onLike: (eventId: string) => void;
  onBookmark: (eventId: string) => void;
  onComment: (eventId: string) => void;
  onShare: (eventId: string) => void;
  onOrganizerClick: (organizerId: string) => void;
  bookmarkedEvents: string[];
  lovedEvents: string[];
  height: number;
}

export const VirtualizedEventList: React.FC<VirtualizedEventListProps> = ({
  events,
  onEventClick,
  onLike,
  onBookmark,
  onComment,
  onShare,
  onOrganizerClick,
  bookmarkedEvents,
  lovedEvents,
  height,
}) => {
  const itemData = useMemo(() => ({
    events,
    onEventClick,
    onLike,
    onBookmark,
    onComment,
    onShare,
    onOrganizerClick,
    bookmarkedEvents,
    lovedEvents,
  }), [
    events,
    onEventClick,
    onLike,
    onBookmark,
    onComment,
    onShare,
    onOrganizerClick,
    bookmarkedEvents,
    lovedEvents,
  ]);

  const Row = ({ index, style, data }: any) => {
    const event = data.events[index];
    return (
      <div style={style}>
        <EventCard
          event={event}
          onClick={() => data.onEventClick(event)}
          onLike={data.onLike}
          onBookmark={data.onBookmark}
          onComment={data.onComment}
          onShare={data.onShare}
          onOrganizerClick={data.onOrganizerClick}
          isBookmarked={data.bookmarkedEvents.includes(event.id)}
          isLoved={data.lovedEvents.includes(event.id)}
        />
      </div>
    );
  };

  return (
    <List
      height={height}
      itemCount={events.length}
      itemSize={400} // Approximate height of EventCard
      itemData={itemData}
    >
      {Row}
    </List>
  );
};