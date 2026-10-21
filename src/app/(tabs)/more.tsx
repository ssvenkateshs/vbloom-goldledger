import { router } from 'expo-router';

import { ListRow, Screen } from '@/components';
import { useAppState, useSettings } from '@/state';

export default function MoreScreen() {
  const { settings } = useSettings();
  const { pinEnabled, lock } = useAppState();
  return (
    <Screen title="More">
      <ListRow title="Rates" subtitle="Daily metal rates, trend and feed" onPress={() => router.push('/rates')} />
      <ListRow title="Reminders" subtitle="Orders to deliver, credit to collect" onPress={() => router.push('/reminders')} />
      <ListRow
        title="Shop settings"
        subtitle={`${settings.shopName} · ${settings.currency} · ${settings.locale}`}
        onPress={() => router.push('/settings')}
      />
      <ListRow title="Backup & data" subtitle="Export, import, CSV and device transfer" onPress={() => router.push('/data')} />
      {pinEnabled ? <ListRow title="Lock now" subtitle="Ask for the PIN immediately" onPress={lock} /> : null}
      <ListRow title="About" subtitle="Formats, licence and version" onPress={() => router.push('/about')} />
    </Screen>
  );
}
