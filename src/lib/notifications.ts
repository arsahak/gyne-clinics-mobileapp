// Inbox shapes shared by the server service, the actions and the client.

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  /** App page to open, e.g. /patient/learn. */
  link?: string;
  read: boolean;
  at: string;
}

export interface BackendNotification {
  _id: string;
  title: string;
  body: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

export const toInboxItem = (n: BackendNotification): InboxItem => ({ id: n._id, title: n.title, body: n.body, link: n.link, read: Boolean(n.readAt), at: n.createdAt });
