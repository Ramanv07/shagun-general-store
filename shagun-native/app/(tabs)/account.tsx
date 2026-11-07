import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Linking, Modal, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Address } from '../../types';
import { PRIVACY_POLICY_URL } from '../../constants';
import { useBackToHome } from '../../components/useAndroidBackHandler';

export default function AccountScreen() {
  useBackToHome();
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const router = useRouter();

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  // Address Modal States
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressFormVisible, setAddressFormVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrFullName, setAddrFullName] = useState('');
  const [addrMobile, setAddrMobile] = useState('');
  const [addrHouseNo, setAddrHouseNo] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPinCode, setAddrPinCode] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5ede8' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5ede8" />
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#7c1f3e" />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: '#7c1f3e' }]}>Account</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="person-circle-outline" size={80} color="#d4b5a0" />
          <Text style={styles.emptyTitle}>Not Logged In</Text>
          <Text style={styles.emptySubtitle}>Log in to manage your profile, saved addresses and view orders</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
            <Text style={styles.loginBtnText}>Login / Register</Text>
          </TouchableOpacity>
          {user?.role === 'admin' && (
            <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin/dashboard')}>
              <Text style={styles.adminBtnText}>Admin Dashboard</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
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

  // ── Address Actions ────────────────────────────────────────────────────────
  const openAddressModal = () => {
    setAddressModalVisible(true);
    setAddressFormVisible(false);
    setEditingAddressId(null);
  };

  const handleStartAddAddress = () => {
    setEditingAddressId(null);
    setAddrFullName(user?.name || '');
    setAddrMobile(user?.phone || '');
    setAddrHouseNo('');
    setAddrStreet('');
    setAddrCity('');
    setAddrState('');
    setAddrPinCode('');
    setAddrIsDefault((user?.addresses?.length || 0) === 0);
    setAddressError('');
    setAddressFormVisible(true);
  };

  const handleStartEditAddress = (addr: Address) => {
    setEditingAddressId(addr._id || null);
    setAddrFullName(addr.fullName || '');
    setAddrMobile(addr.mobile || '');
    setAddrHouseNo(addr.houseNo || '');
    setAddrStreet(addr.street || '');
    setAddrCity(addr.city || '');
    setAddrState(addr.state || '');
    setAddrPinCode(addr.pinCode || '');
    setAddrIsDefault(!!addr.isDefault);
    setAddressError('');
    setAddressFormVisible(true);
  };

  const handleSaveAddress = async () => {
    setAddressError('');
    if (!addrFullName.trim() || !addrMobile.trim() || !addrHouseNo.trim() || !addrStreet.trim() || !addrCity.trim() || !addrState.trim() || !addrPinCode.trim()) {
      setAddressError('Please fill in all address fields.');
      return;
    }
    const cleanMobile = addrMobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length < 10) {
      setAddressError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (addrPinCode.replace(/\D/g, '').length !== 6) {
      setAddressError('Please enter a valid 6-digit PIN code.');
      return;
    }

    setSavingAddress(true);
    try {
      const payload = {
        fullName: addrFullName.trim(),
        mobile: cleanMobile,
        houseNo: addrHouseNo.trim(),
        street: addrStreet.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        pinCode: addrPinCode.replace(/\D/g, ''),
        isDefault: addrIsDefault,
      };

      let updatedAddresses: Address[] = [];
      if (editingAddressId) {
        updatedAddresses = await api.updateAddress(editingAddressId, payload);
      } else {
        updatedAddresses = await api.addAddress(payload);
      }

      if (user && Array.isArray(updatedAddresses)) {
        updateUser({ ...user, addresses: updatedAddresses });
      }
      setAddressFormVisible(false);
      setEditingAddressId(null);
    } catch (err: any) {
      console.warn('Backend address save failed, updating locally:', err);
      const fallbackAddresses = [...(user?.addresses || [])];
      const newAddr: Address = {
        _id: editingAddressId || `addr_${Date.now()}`,
        fullName: addrFullName.trim(),
        mobile: addrMobile.replace(/\D/g, '').slice(-10),
        houseNo: addrHouseNo.trim(),
        street: addrStreet.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        pinCode: addrPinCode.replace(/\D/g, ''),
        isDefault: addrIsDefault,
      };
      if (addrIsDefault) {
        fallbackAddresses.forEach(a => { a.isDefault = false; });
      }
      if (editingAddressId) {
        const idx = fallbackAddresses.findIndex(a => a._id === editingAddressId);
        if (idx !== -1) fallbackAddresses[idx] = newAddr;
      } else {
        fallbackAddresses.push(newAddr);
      }
      if (user) {
        updateUser({ ...user, addresses: fallbackAddresses });
      }
      setAddressFormVisible(false);
      setEditingAddressId(null);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (addrId: string) => {
    try {
      const updated = await api.updateAddress(addrId, { isDefault: true });
      if (user && Array.isArray(updated)) {
        updateUser({ ...user, addresses: updated });
      }
    } catch {
      if (user?.addresses) {
        const updated = user.addresses.map(a => ({ ...a, isDefault: a._id === addrId }));
        updateUser({ ...user, addresses: updated });
      }
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this delivery address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await api.deleteAddress(addrId);
              if (user && Array.isArray(updated)) {
                updateUser({ ...user, addresses: updated });
              }
            } catch {
              if (user?.addresses) {
                const updated = user.addresses.filter(a => a._id !== addrId);
                updateUser({ ...user, addresses: updated });
              }
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#7c1f3e' }}>
      <StatusBar barStyle="light-content" backgroundColor="#7c1f3e" />

      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Account & Profile</Text>
        <View style={{ width: 36 }} />
      </View>

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
          <TouchableOpacity onPress={() => setEditMode(!editMode)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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

      {/* Quick Links Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Account</Text>

        {/* My Orders */}
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/orders')}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="receipt-outline" size={20} color="#7c1f3e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuItemText}>My Orders</Text>
            <Text style={styles.menuItemSub}>Track, return or buy again</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d4b5a0" />
        </TouchableOpacity>

        {/* My Addresses */}
        <TouchableOpacity style={styles.menuItem} onPress={openAddressModal}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="location-outline" size={20} color="#7c1f3e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuItemText}>My Addresses</Text>
            <Text style={styles.menuItemSub}>
              {user.addresses && user.addresses.length > 0
                ? `${user.addresses.length} saved location${user.addresses.length > 1 ? 's' : ''}`
                : 'Add or manage delivery locations'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d4b5a0" />
        </TouchableOpacity>

        {/* Beauty Parlor */}
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/beauty-parlor')}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="flower-outline" size={20} color="#7c1f3e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuItemText}>Beauty Parlor</Text>
            <Text style={styles.menuItemSub}>Book professional makeup & bridal services</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d4b5a0" />
        </TouchableOpacity>

        {/* Bridal Lehenga */}
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/bridal-lehenga')}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="heart-outline" size={20} color="#7c1f3e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuItemText}>Bridal Lehenga</Text>
            <Text style={styles.menuItemSub}>Rent designer bridal lehengas for your special day</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d4b5a0" />
        </TouchableOpacity>

        {user.role === 'admin' && (
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/dashboard')}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="shield-outline" size={20} color="#d4a853" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemText, { color: '#d4a853' }]}>Admin Dashboard</Text>
              <Text style={styles.menuItemSub}>Manage orders, products and users</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d4b5a0" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="document-text-outline" size={20} color="#7c1f3e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuItemText}>Privacy Policy</Text>
            <Text style={styles.menuItemSub}>Read our privacy terms and data policy</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#d4b5a0" />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutBtnText}>Logout</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity style={styles.deleteAccountBtn} onPress={confirmDeleteAccount}>
        <Ionicons name="trash-outline" size={18} color="#991b1b" />
        <Text style={styles.deleteAccountBtnText}>Delete Account</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* ── Address Management Modal ─────────────────────────────────────────── */}
      <Modal visible={addressModalVisible} animationType="slide" onRequestClose={() => setAddressModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f5ede8' }}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="location" size={22} color="#7c1f3e" />
              <Text style={styles.modalTitle}>My Addresses</Text>
            </View>
            <TouchableOpacity onPress={() => setAddressModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={26} color="#7c1f3e" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 14 }} showsVerticalScrollIndicator={false}>
            {addressFormVisible ? (
              /* Add/Edit Form */
              <View style={styles.modalCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Text style={styles.formTitle}>
                    {editingAddressId ? '✏️ Edit Address' : '➕ Add New Address'}
                  </Text>
                  <TouchableOpacity onPress={() => setAddressFormVisible(false)}>
                    <Text style={{ color: '#7c1f3e', fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                {addressError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{addressError}</Text>
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#9c7a8a"
                  value={addrFullName}
                  onChangeText={setAddrFullName}
                />

                <Text style={styles.fieldLabel}>Mobile Number *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#9c7a8a"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={addrMobile}
                  onChangeText={setAddrMobile}
                />

                <Text style={styles.fieldLabel}>House / Flat / Building No. *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Flat 302, Royal Enclave"
                  placeholderTextColor="#9c7a8a"
                  value={addrHouseNo}
                  onChangeText={setAddrHouseNo}
                />

                <Text style={styles.fieldLabel}>Street / Area / Landmark *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Main Market, Near SBI"
                  placeholderTextColor="#9c7a8a"
                  value={addrStreet}
                  onChangeText={setAddrStreet}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>City *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. Chhatarpur"
                      placeholderTextColor="#9c7a8a"
                      value={addrCity}
                      onChangeText={setAddrCity}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>State *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. MP"
                      placeholderTextColor="#9c7a8a"
                      value={addrState}
                      onChangeText={setAddrState}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>PIN Code *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="6-digit PIN"
                  placeholderTextColor="#9c7a8a"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={addrPinCode}
                  onChangeText={setAddrPinCode}
                />

                <TouchableOpacity
                  style={styles.checkboxRow}
                  activeOpacity={0.8}
                  onPress={() => setAddrIsDefault(!addrIsDefault)}
                >
                  <Ionicons
                    name={addrIsDefault ? 'checkbox' : 'square-outline'}
                    size={22}
                    color="#7c1f3e"
                  />
                  <Text style={styles.checkboxText}>Set as default delivery address</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSaveAddress}
                  disabled={savingAddress}
                  activeOpacity={0.85}
                >
                  {savingAddress ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {editingAddressId ? 'Update Address' : 'Save Address'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Address List View */
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleStartAddAddress}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.addBtnText}>+ Add New Address</Text>
                </TouchableOpacity>

                {user.addresses && user.addresses.length > 0 ? (
                  user.addresses.map((addr: Address, i: number) => (
                    <View key={addr._id || i} style={styles.addrCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.addrFullName}>{addr.fullName}</Text>
                        {addr.isDefault && (
                          <View style={styles.defaultTag}>
                            <Text style={styles.defaultTagText}>DEFAULT</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.addrLine}>
                        {addr.houseNo}, {addr.street}, {addr.city}, {addr.state} – {addr.pinCode}
                      </Text>
                      <Text style={styles.addrPhone}>📞 {addr.mobile}</Text>

                      <View style={styles.addrActions}>
                        {!addr.isDefault && (
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleSetDefaultAddress(addr._id!)}
                          >
                            <Text style={styles.actionBtnText}>Set Default</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleStartEditAddress(addr)}
                        >
                          <Ionicons name="pencil" size={14} color="#7c1f3e" />
                          <Text style={styles.actionBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: '#ef4444' }]}
                          onPress={() => handleDeleteAddress(addr._id!)}
                        >
                          <Ionicons name="trash" size={14} color="#ef4444" />
                          <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyModalView}>
                    <Ionicons name="location-outline" size={60} color="#d4b5a0" />
                    <Text style={styles.emptyModalTitle}>No Addresses Saved</Text>
                    <Text style={styles.emptyModalSub}>
                      Add your home or work delivery address for faster checkout.
                    </Text>
                    <TouchableOpacity style={styles.addBtn} onPress={handleStartAddAddress}>
                      <Text style={styles.addBtnText}>+ Add Delivery Address</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede8' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40, backgroundColor: '#f5ede8' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#7c1f3e' },
  emptySubtitle: { fontSize: 13, color: '#777', textAlign: 'center', lineHeight: 18 },
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#7c1f3e', marginBottom: 12 },
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
  menuIconContainer: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fbf5f2',
    alignItems: 'center', justifyContent: 'center',
  },
  menuItemText: { fontSize: 14.5, color: '#1a0a12', fontWeight: '600' },
  menuItemSub: { fontSize: 12, color: '#888', marginTop: 2 },
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

  // Modal Styles
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8d5c4',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#7c1f3e' },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#7c1f3e' },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 8 },
  modalInput: {
    borderWidth: 1, borderColor: '#e8d5c4', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14, color: '#1a0a12', backgroundColor: '#faf6f3',
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 14 },
  checkboxText: { fontSize: 13, color: '#333', fontWeight: '500' },
  primaryBtn: {
    backgroundColor: '#7c1f3e', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errorBanner: {
    backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  errorBannerText: { color: '#dc2626', fontSize: 13, fontWeight: '500' },
  addBtn: {
    backgroundColor: '#7c1f3e', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  addrCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderLeftWidth: 4, borderLeftColor: '#7c1f3e',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  addrFullName: { fontSize: 15, fontWeight: '700', color: '#1a0a12' },
  defaultTag: {
    backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: '#f59e0b',
  },
  defaultTagText: { fontSize: 10, fontWeight: '800', color: '#b45309' },
  addrLine: { fontSize: 13, color: '#444', lineHeight: 18, marginTop: 4 },
  addrPhone: { fontSize: 12.5, color: '#666', marginTop: 4 },
  addrActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0e4da' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
    borderWidth: 1, borderColor: '#7c1f3e',
  },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#7c1f3e' },
  emptyModalView: { alignItems: 'center', justifyContent: 'center', padding: 30, gap: 10 },
  emptyModalTitle: { fontSize: 17, fontWeight: '700', color: '#7c1f3e' },
  emptyModalSub: { fontSize: 13, color: '#777', textAlign: 'center', lineHeight: 18, marginBottom: 10 },
});
