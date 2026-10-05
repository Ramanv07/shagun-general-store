import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Address } from '../../types';
import { PRIVACY_POLICY_URL } from '../../constants';

export default function AccountScreen() {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.empty}>
        <Ionicons name="person-circle-outline" size={80} color="#d4b5a0" />
        <Text style={styles.emptyTitle}>Not Logged In</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>Login / Register</Text>
        </TouchableOpacity>
        {user?.role === 'admin' && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin/dashboard')}>
            <Text style={styles.adminBtnText}>Admin Dashboard</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.updateProfile({ name, phone });
      updateUser(updated);
      setEditMode(false);
      Alert.alert('✅ Success', 'Profile updated!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'Are you sure you want to delete your account? This will permanently remove your profile and personal data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAccount();
              logout();
              Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.role === 'admin' && (
            <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>
          )}
        </View>
        <TouchableOpacity onPress={() => setEditMode(!editMode)}>
          <Ionicons name={editMode ? 'close' : 'pencil'} size={22} color="#d4a853" />
        </TouchableOpacity>
      </View>

      {/* Edit Profile Form */}
      {editMode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edit Profile</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full Name" placeholderTextColor="#9c7a8a" />
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone Number" placeholderTextColor="#9c7a8a" keyboardType="phone-pad" />
          <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Links</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/orders')}>
          <Ionicons name="receipt-outline" size={20} color="#7c1f3e" />
          <Text style={styles.menuItemText}>My Orders</Text>
          <Ionicons name="chevron-forward" size={18} color="#d4b5a0" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/beauty-parlor')}>
          <Ionicons name="sparkles-outline" size={20} color="#7c1f3e" />
          <Text style={styles.menuItemText}>Beauty Parlor</Text>
          <Ionicons name="chevron-forward" size={18} color="#d4b5a0" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/bridal-lehenga')}>
          <Ionicons name="heart-outline" size={20} color="#7c1f3e" />
          <Text style={styles.menuItemText}>Bridal Lehenga</Text>
          <Ionicons name="chevron-forward" size={18} color="#d4b5a0" />
        </TouchableOpacity>

        {user.role === 'admin' && (
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/dashboard')}>
            <Ionicons name="shield-outline" size={20} color="#d4a853" />
            <Text style={[styles.menuItemText, { color: '#d4a853' }]}>Admin Dashboard</Text>
            <Ionicons name="chevron-forward" size={18} color="#d4b5a0" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          <Ionicons name="document-text-outline" size={20} color="#7c1f3e" />
          <Text style={styles.menuItemText}>Privacy Policy</Text>
          <Ionicons name="open-outline" size={18} color="#d4b5a0" />
        </TouchableOpacity>
      </View>

      {/* Addresses */}
      {user.addresses && user.addresses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Addresses</Text>
          {user.addresses.map((addr: Address, i: number) => (
            <View key={addr._id || i} style={styles.addressCard}>
              {addr.isDefault && <Text style={styles.defaultBadge}>Default</Text>}
              <Text style={styles.addressName}>{addr.fullName}</Text>
              <Text style={styles.addressText}>{addr.houseNo}, {addr.street}, {addr.city}, {addr.state} - {addr.pinCode}</Text>
              <Text style={styles.addressText}>📞 {addr.mobile}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutBtnText}>Logout</Text>
      </TouchableOpacity>

      {/* Delete Account (Google Play Requirement) */}
      <TouchableOpacity style={styles.deleteAccountBtn} onPress={confirmDeleteAccount}>
        <Ionicons name="trash-outline" size={18} color="#991b1b" />
        <Text style={styles.deleteAccountBtnText}>Delete Account</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede8' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#7c1f3e' },
  loginBtn: { backgroundColor: '#7c1f3e', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 },
  loginBtnText: { color: '#f5ede8', fontWeight: '700', fontSize: 15 },
  adminBtn: { backgroundColor: '#d4a853', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 },
  adminBtnText: { color: '#1a0a12', fontWeight: '700', fontSize: 15 },
  profileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#7c1f3e', padding: 20, paddingTop: 28,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#d4a853',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#1a0a12' },
  userName: { color: '#f5ede8', fontSize: 18, fontWeight: '700' },
  userEmail: { color: '#d4b5a0', fontSize: 13 },
  adminBadge: { backgroundColor: '#d4a853', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  adminBadgeText: { color: '#1a0a12', fontSize: 11, fontWeight: '700' },
  section: {
    backgroundColor: '#fff', margin: 12, marginTop: 12, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#7c1f3e', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#e8d5c4', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: '#1a0a12', marginBottom: 10, backgroundColor: '#f5ede8',
  },
  saveBtn: { backgroundColor: '#7c1f3e', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#f5ede8', fontWeight: '700', fontSize: 14 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#f0e4da', gap: 12,
  },
  menuItemText: { flex: 1, fontSize: 14, color: '#1a0a12', fontWeight: '500' },
  addressCard: {
    backgroundColor: '#f5ede8', borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#7c1f3e',
  },
  defaultBadge: { color: '#7c1f3e', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  addressName: { fontWeight: '700', color: '#1a0a12', marginBottom: 2 },
  addressText: { color: '#555', fontSize: 13, lineHeight: 18 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 12, marginTop: 4, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ef4444',
  },
  logoutBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  deleteAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 12, padding: 12, borderRadius: 12,
    backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5',
  },
  deleteAccountBtnText: { color: '#991b1b', fontWeight: '600', fontSize: 13 },
});
