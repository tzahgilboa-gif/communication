import type { Channel } from '../types';

export function Avatar({ name, channel, big }: { name: string; channel?: Channel; big?: boolean }) {
  const parts = name.trim().split(/\s+/);
  const isNumber = /^[0-9-]+$/.test(name);
  return (
    <div className={'avatar' + (big ? ' big' : '')} aria-hidden="true">
      {isNumber ? <i className="fa-solid fa-user" /> : (parts[0][0] || '') + (parts[1] ? parts[1][0] : '')}
      {channel && (
        <span className={'ch ' + channel}>
          <i className={channel === 'wa' ? 'fa-brands fa-whatsapp' : 'fa-solid fa-comment-sms'} />
        </span>
      )}
    </div>
  );
}
