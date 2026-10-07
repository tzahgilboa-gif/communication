import type { Channel } from '../types';
import { Icon } from './Icon';

export function Avatar({ name, channel, big }: { name: string; channel?: Channel; big?: boolean }) {
  const parts = name.trim().split(/\s+/);
  const isNumber = /^[0-9-]+$/.test(name);
  return (
    <div className={'avatar' + (big ? ' big' : '')} aria-hidden="true">
      {isNumber ? <Icon name="solid/user" /> : (parts[0][0] || '') + (parts[1] ? parts[1][0] : '')}
      {channel && (
        <span className={'ch ' + channel}>
          <Icon name={channel === 'wa' ? 'brands/whatsapp' : 'solid/comment-sms'} />
        </span>
      )}
    </div>
  );
}
