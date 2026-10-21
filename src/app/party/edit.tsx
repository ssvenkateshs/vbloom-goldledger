import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Field, Screen, ToggleGroup } from '@/components';
import { partyRepo } from '@/data';
import { PARTY_ROLES, PartySchema, newId, nowIso, type Party, type PartyRole } from '@/domain';
import { ROLE_LABEL } from '@/labels';
import { Spacing } from '@/theme';

export default function PartyEditScreen() {
  const { id, role } = useLocalSearchParams<{ id?: string; role?: PartyRole }>();
  const db = useSQLiteContext();
  const [existing, setExisting] = useState<Party | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [roles, setRoles] = useState<PartyRole[]>([role ?? 'customer']);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [idDocument, setIdDocument] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (!id) return;
    partyRepo.get(db, id).then((p) => {
      if (!p) return;
      setExisting(p);
      setName(p.name);
      setRoles(p.roles);
      setPhone(p.phone ?? '');
      setEmail(p.email ?? '');
      setAddress(p.address ?? '');
      setTaxId(p.taxId ?? '');
      setIdDocument(p.idDocument ?? '');
      setNotes(p.notes ?? '');
      setTags(p.tags.join(', '));
    });
  }, [db, id]);

  async function save() {
    setError(null);
    const now = nowIso();
    const parsed = PartySchema.safeParse({
      id: existing?.id ?? newId(),
      name,
      roles,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      taxId: taxId.trim() || null,
      idDocument: idDocument.trim() || null,
      notes: notes.trim() || null,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(`${issue.path.join('.')}: ${issue.message}`);
      return;
    }
    setSaving(true);
    try {
      await partyRepo.upsert(db, parsed.data);
      if (existing) router.back();
      else router.replace({ pathname: '/party/[id]', params: { id: parsed.data.id } });
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      insideStack
      title={existing ? 'Edit party' : 'New party'}
      footer={
        <View style={styles.footer}>
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button title="Save" onPress={save} loading={saving} />
        </View>
      }>
      {error ? (
        <AppText variant="small" color="negative">
          {error}
        </AppText>
      ) : null}
      <Card>
        <Field label="Name" value={name} onChangeText={setName} autoFocus={!id} />
        <ToggleGroup label="Roles" options={PARTY_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} values={roles} onChange={setRoles} />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Address" value={address} onChangeText={setAddress} multiline />
      </Card>
      <Card title="Compliance">
        <Field label="Tax ID" value={taxId} onChangeText={setTaxId} autoCapitalize="characters" placeholder="GSTIN / VAT" />
        <Field
          label="ID document"
          value={idDocument}
          onChangeText={setIdDocument}
          placeholder="PAN, Aadhaar last 4, passport ..."
          hint="For KYC on high-value sales"
        />
      </Card>
      <Card title="Notes">
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
        <Field label="Tags" value={tags} onChangeText={setTags} placeholder="vip, wholesale" hint="Comma separated" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm } });
