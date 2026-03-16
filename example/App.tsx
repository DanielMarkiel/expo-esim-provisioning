import {
  buildActivationString,
  EsimProvisioningError,
  EsimProvisioningErrorCode,
  getActiveSubscriptionCount,
  install,
  installEsim,
  isEsimSupported,
  scanQrCode,
} from 'expo-esim-provisioning';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  KeyboardTypeOptions,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; message: string }
  | { status: 'error'; code: EsimProvisioningErrorCode | string; message: string };

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscriptionCount, setSubscriptionCount] = useState<number>(-1);
  const appState = useRef(AppState.currentState);
  const subscriptionCountBefore = useRef(-1);
  const [returnBanner, setReturnBanner] = useState<string | null>(null);

  useEffect(() => {
    setSupported(isEsimSupported());
    setSubscriptionCount(getActiveSubscriptionCount());
  }, []);

  // Detect return from iOS eSIM setup sheet and compare subscription count
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        const countAfter = getActiveSubscriptionCount();
        setSubscriptionCount(countAfter);

        if (Platform.OS === 'ios' && subscriptionCountBefore.current >= 0) {
          const before = subscriptionCountBefore.current;
          if (countAfter > before) {
            setReturnBanner(`New subscription detected (${before} → ${countAfter}) — confirm with backend`);
          } else {
            setReturnBanner(`Subscription count unchanged (${countAfter}) — user likely canceled`);
          }
          subscriptionCountBefore.current = -1;
        } else {
          setReturnBanner('↩ Returned from eSIM setup — re-check status with your backend');
        }
        setTimeout(() => setReturnBanner(null), 5000);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>expo-esim-provisioning</Text>
          <Text style={styles.headerSub}>Demo App</Text>
        </View>

        {/* eSIM Support Status */}
        <SupportCard supported={supported} subscriptionCount={subscriptionCount} />

        {/* iOS return banner */}
        {returnBanner && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{returnBanner}</Text>
          </View>
        )}

        {/* Install eSIM */}
        <InstallSection supported={supported} subscriptionCountBefore={subscriptionCountBefore} />

        {/* Android-only */}
        {Platform.OS === 'android' && <AndroidSection />}

        {/* Utility */}
        <UtilitySection />

        {/* Error codes reference */}
        <ErrorCodesSection />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Support Status Card ──────────────────────────────────────────────────────

function SupportCard({ supported, subscriptionCount }: { supported: boolean | null; subscriptionCount: number }) {
  const icon = supported === null ? '⏳' : supported ? '✅' : '❌';
  const label = supported === null ? 'Checking…' : supported ? 'eSIM supported' : 'eSIM not supported';

  let detail = '';
  if (supported !== null) {
    if (Platform.OS === 'android') {
      detail = supported
        ? 'EuiccManager.isEnabled → true'
        : 'EuiccManager.isEnabled → false (no eUICC chip or LPA unavailable)';
    } else if (Platform.OS === 'ios') {
      const ver = Number(Platform.Version);
      detail = supported ? `iOS ${ver} ≥ 17.4 — Universal Link approach` : `iOS ${ver} < 17.4 — requires iOS 17.4+`;
    } else {
      detail = 'Platform not supported';
    }
  }

  const countLabel =
    subscriptionCount >= 0
      ? `Active subscriptions: ${subscriptionCount} (via CTTelephonyNetworkInfo)`
      : 'Active subscriptions: N/A';

  return (
    <Card title="Device Support">
      <View style={styles.supportRow}>
        <Text style={styles.supportIcon}>{icon}</Text>
        <View style={styles.supportText}>
          <Text style={[styles.supportLabel, supported === false && styles.textDanger]}>{label}</Text>
          {!!detail && <Text style={styles.supportDetail}>{detail}</Text>}
          <Text style={styles.supportDetail}>{countLabel}</Text>
        </View>
      </View>
      {supported === false && (
        <View style={styles.note}>
          <Text style={styles.noteText}>
            ⚠️ eSIM functionality requires a physical device with eSIM hardware. Simulators and emulators are not
            supported.
          </Text>
        </View>
      )}
    </Card>
  );
}

// ─── Install Section ──────────────────────────────────────────────────────────

function InstallSection({
  supported,
  subscriptionCountBefore,
}: {
  supported: boolean | null;
  subscriptionCountBefore: React.MutableRefObject<number>;
}) {
  const [useLpa, setUseLpa] = useState(false);
  const [lpaString, setLpaString] = useState('');
  const [smdpAddress, setSmdpAddress] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [result, setResult] = useState<ResultState>({ status: 'idle' });

  const handleInstall = useCallback(async () => {
    setResult({ status: 'loading' });
    if (Platform.OS === 'ios') {
      subscriptionCountBefore.current = getActiveSubscriptionCount();
    }
    try {
      const data = useLpa ? { lpaString } : { smdpAddress, activationCode };
      const msg = await installEsim(data);
      setResult({ status: 'success', message: msg });
    } catch (e) {
      subscriptionCountBefore.current = -1;
      if (e instanceof EsimProvisioningError) {
        setResult({ status: 'error', code: e.code, message: e.message });
      } else {
        setResult({ status: 'error', code: 'UNKNOWN', message: String(e) });
      }
    }
  }, [useLpa, lpaString, smdpAddress, activationCode, subscriptionCountBefore]);

  const isDisabled = supported === false || result.status === 'loading';

  return (
    <Card title="installEsim()">
      <Row label="Use full LPA string">
        <Switch value={useLpa} onValueChange={setUseLpa} />
      </Row>

      {useLpa ? (
        <LabeledInput
          label="LPA String"
          placeholder="LPA:1$smdp.example.com$ACTIVATION_CODE"
          value={lpaString}
          onChangeText={setLpaString}
          autoCapitalize="characters"
        />
      ) : (
        <>
          <LabeledInput
            label="SM-DP+ Address"
            placeholder="smdp.example.com"
            value={smdpAddress}
            onChangeText={setSmdpAddress}
            autoCapitalize="none"
            keyboardType="url"
          />
          <LabeledInput
            label="Activation Code"
            placeholder="ABC-XYZ-123"
            value={activationCode}
            onChangeText={setActivationCode}
            autoCapitalize="characters"
          />
        </>
      )}

      <ActionButton
        title="Install eSIM"
        onPress={handleInstall}
        disabled={isDisabled}
        loading={result.status === 'loading'}
      />

      <ResultBox result={result} />

      {Platform.OS === 'ios' && (
        <View style={styles.note}>
          <Text style={styles.noteText}>
            📱 On iOS the system eSIM sheet opens and the app goes to background. Return detection is handled via
            AppState (see banner above).
          </Text>
        </View>
      )}
    </Card>
  );
}

// ─── Android-only Section ─────────────────────────────────────────────────────

function AndroidSection() {
  const [activationCode, setActivationCode] = useState('');
  const [installResult, setInstallResult] = useState<ResultState>({ status: 'idle' });
  const [qrResult, setQrResult] = useState<ResultState>({ status: 'idle' });

  const handleInstall = useCallback(async () => {
    setInstallResult({ status: 'loading' });
    try {
      const msg = await install(activationCode);
      setInstallResult({ status: 'success', message: msg });
    } catch (e) {
      if (e instanceof EsimProvisioningError) {
        setInstallResult({ status: 'error', code: e.code, message: e.message });
      } else {
        setInstallResult({ status: 'error', code: 'UNKNOWN', message: String(e) });
      }
    }
  }, [activationCode]);

  const handleScanQr = useCallback(async () => {
    setQrResult({ status: 'loading' });
    try {
      const msg = await scanQrCode();
      setQrResult({ status: 'success', message: msg });
    } catch (e) {
      if (e instanceof EsimProvisioningError) {
        setQrResult({ status: 'error', code: e.code, message: e.message });
      } else {
        setQrResult({ status: 'error', code: 'UNKNOWN', message: String(e) });
      }
    }
  }, []);

  return (
    <Card title="Android-only APIs" badge="Android">
      {/* install() */}
      <Text style={styles.subTitle}>install(activationCode)</Text>
      <Text style={styles.subDesc}>Low-level: pass a full LPA string directly to the native eSIM activation UI.</Text>
      <LabeledInput
        label="LPA / Activation Code"
        placeholder="LPA:1$smdp.example.com$CODE"
        value={activationCode}
        onChangeText={setActivationCode}
        autoCapitalize="characters"
      />
      <ActionButton
        title="install()"
        onPress={handleInstall}
        disabled={installResult.status === 'loading'}
        loading={installResult.status === 'loading'}
      />
      <ResultBox result={installResult} />

      <Divider />

      {/* scanQrCode() */}
      <Text style={styles.subTitle}>scanQrCode()</Text>
      <Text style={styles.subDesc}>
        Launch the system QR code scanner for eSIM provisioning. Primarily supported on Samsung devices (Android 11+).
      </Text>
      <ActionButton
        title="Scan QR Code"
        onPress={handleScanQr}
        disabled={qrResult.status === 'loading'}
        loading={qrResult.status === 'loading'}
      />
      <ResultBox result={qrResult} />
    </Card>
  );
}

// ─── Utility Section ──────────────────────────────────────────────────────────

function UtilitySection() {
  const [smdp, setSmdp] = useState('smdp.example.com');
  const [code, setCode] = useState('ABC-XYZ-123');
  const [output, setOutput] = useState<string | null>(null);

  const handleBuild = useCallback(() => {
    const result = buildActivationString({ smdpAddress: smdp, activationCode: code });
    setOutput(result);
  }, [smdp, code]);

  return (
    <Card title="buildActivationString()">
      <Text style={styles.subDesc}>Build an LPA string from SM-DP+ address and activation code.</Text>
      <LabeledInput
        label="SM-DP+ Address"
        placeholder="smdp.example.com"
        value={smdp}
        onChangeText={setSmdp}
        autoCapitalize="none"
        keyboardType="url"
      />
      <LabeledInput
        label="Activation Code"
        placeholder="ABC-XYZ-123"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
      />
      <ActionButton title="Build LPA String" onPress={handleBuild} />
      {output !== null && (
        <View style={styles.outputBox}>
          <Text style={styles.outputLabel}>Result</Text>
          <Text style={styles.outputValue} selectable>
            {output ?? '(null — missing data)'}
          </Text>
        </View>
      )}
    </Card>
  );
}

// ─── Error Codes Reference ────────────────────────────────────────────────────

const ERROR_CODES: { code: EsimProvisioningErrorCode; platform: string; desc: string }[] = [
  { code: 'NO_DATA', platform: 'Both', desc: 'Activation data is missing or incomplete.' },
  { code: 'UNSUPPORTED', platform: 'Both', desc: 'Device/OS does not support eSIM.' },
  { code: 'USER_CANCELED', platform: 'Android', desc: 'User dismissed the activation UI.' },
  { code: 'INSTALL_FAILED', platform: 'Android', desc: 'Native installation failed.' },
  { code: 'LINK_FAILED', platform: 'iOS', desc: 'Universal Link could not be opened.' },
];

function ErrorCodesSection() {
  return (
    <Card title="EsimProvisioningError codes">
      {ERROR_CODES.map(({ code, platform, desc }) => (
        <View key={code} style={styles.errorRow}>
          <View style={styles.errorHeader}>
            <Text style={styles.errorCode}>{code}</Text>
            <View style={[styles.platformBadge, platform === 'Both' && styles.platformBadgeBoth]}>
              <Text style={styles.platformBadgeText}>{platform}</Text>
            </View>
          </View>
          <Text style={styles.errorDesc}>{desc}</Text>
        </View>
      ))}
    </Card>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function Card({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>{title}</Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function LabeledInput({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable style={[styles.button, disabled && styles.buttonDisabled]} onPress={onPress} disabled={disabled}>
      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>{title}</Text>}
    </Pressable>
  );
}

function ResultBox({ result }: { result: ResultState }) {
  if (result.status === 'idle') return null;
  if (result.status === 'loading') return null;

  const isSuccess = result.status === 'success';
  return (
    <View style={[styles.resultBox, isSuccess ? styles.resultSuccess : styles.resultError]}>
      {!isSuccess && (
        <Text style={[styles.resultCode, styles.textDanger]}>Error code: {(result as { code: string }).code}</Text>
      )}
      <Text style={isSuccess ? styles.resultMessageSuccess : styles.resultMessageError}>{result.message}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  primary: '#007AFF',
  primaryDisabled: '#A0C4F5',
  danger: '#FF3B30',
  success: '#34C759',
  successBg: '#F0FFF4',
  errorBg: '#FFF5F5',
  text: '#1C1C1E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  androidBadge: '#3DDC84',
  iosBadge: '#007AFF',
  bothBadge: '#8B5CF6',
  noteBg: '#FFFBEB',
  noteBorder: '#FCD34D',
  bannerBg: '#EFF6FF',
  bannerBorder: '#93C5FD',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Banner
  banner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.bannerBg,
    borderColor: COLORS.bannerBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  bannerText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },

  // Card
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.androidBadge,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Support
  supportRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  supportIcon: { fontSize: 28 },
  supportText: { flex: 1 },
  supportLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  supportDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rowLabel: { fontSize: 14, color: COLORS.text },

  // Inputs
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#FAFAFA',
  },

  // Button
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { backgroundColor: COLORS.primaryDisabled },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Result
  resultBox: { marginTop: 12, borderRadius: 8, padding: 12, borderWidth: 1 },
  resultSuccess: { backgroundColor: COLORS.successBg, borderColor: COLORS.success },
  resultError: { backgroundColor: COLORS.errorBg, borderColor: COLORS.danger },
  resultCode: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  resultMessageSuccess: { fontSize: 13, color: '#166534' },
  resultMessageError: { fontSize: 13, color: '#991B1B' },

  // Note
  note: {
    marginTop: 12,
    backgroundColor: COLORS.noteBg,
    borderColor: COLORS.noteBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  noteText: { fontSize: 12, color: '#92400E', lineHeight: 17 },

  // Sub sections
  subTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  subDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10, lineHeight: 18 },

  // Divider
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },

  // Output box
  outputBox: {
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outputLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4, fontWeight: '500' },
  outputValue: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Error codes
  errorRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  errorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  errorCode: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  platformBadge: {
    backgroundColor: COLORS.iosBadge,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  platformBadgeBoth: { backgroundColor: COLORS.bothBadge },
  platformBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  errorDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },

  // Misc
  textDanger: { color: COLORS.danger },
});
