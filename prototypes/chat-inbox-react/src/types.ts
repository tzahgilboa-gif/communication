export type Channel = 'wa' | 'sms';
export type ConvStatus = 'open' | 'closed';
export type MsgStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type Priority = 'high' | 'normal' | 'low';
export type ComposerMode = 'reply' | 'task' | 'note';

export interface Media {
  type: 'image' | 'pdf';
  url: string;
  name: string;
  size?: number;
}

export interface SendError {
  code: number | 'network';
  /** the raw text the API returned, kept for support */
  detail?: string;
}

export interface Message {
  id: string;
  dir?: 'in' | 'out';
  note?: boolean;
  text: string;
  time: Date;
  status?: MsgStatus;
  media?: Media;
  /** "campaign: ..." or "template: ..." */
  srcLabel?: string;
  /** set when this was sent as a template */
  template?: { name: string; vars: string[] };
  error?: SendError;
}

export interface Conversation {
  id: number;
  name: string;
  phone: string;
  channel: Channel;
  status: ConvStatus;
  unread: number;
  pin: number;
  groups: string[];
  lastCampaign: string;
  optedOut: boolean;
  messages: Message[];
  /** messages in the DB that are not loaded yet, oldest first */
  older: Message[];
}

export interface Task {
  id: number;
  convId: number;
  title: string;
  due: Date | null;
  prio: Priority;
  done: boolean;
  created: Date;
  doneAt?: Date | null;
}

export interface Template {
  name: string;
  label: string;
  body: string;
}

export interface QuickReply {
  key: string;
  text: string;
}

export interface Attachment extends Media {
  size: number;
  file: File;
}
