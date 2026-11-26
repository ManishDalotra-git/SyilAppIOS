
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchImageLibrary} from 'react-native-image-picker';

const ADMIN_EMAILS = [
  'manish.dalotra@techstriker.com',
  'fabuikema@gmail.com',
];

const API_BASE_URL = 'https://syilapp-w8ye.onrender.com';
const MAX_FILES = 5;

const Announcements = ({navigation}) => {
  const [userEmail, setUserEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const email = await AsyncStorage.getItem('userEmail');
        const first = await AsyncStorage.getItem('userFirstName');
        const last = await AsyncStorage.getItem('userLastName');

        setUserEmail(email || '');
        setFirstName(first || '');
        setLastName(last || '');
      } catch (error) {
        console.error('Load user error:', error);
        Alert.alert('Error', 'Unable to load user details.');
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, []);

  const isAdmin = ADMIN_EMAILS.includes(
    userEmail.trim().toLowerCase(),
  );

  const handlePickMedia = async () => {
    if (publishing) {
      return;
    }

    const remaining = MAX_FILES - selectedMedia.length;

    if (remaining <= 0) {
      Alert.alert(
        'Limit reached',
        `You can select up to ${MAX_FILES} files.`,
      );
      return;
    }

    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: remaining,
        includeExtra: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'Picker error',
          result.errorMessage || 'Could not open media picker.',
        );
        return;
      }

      const assets = (result.assets || []).filter(
        asset => asset.uri && asset.type,
      );

      setSelectedMedia(current =>
        [...current, ...assets].slice(0, MAX_FILES),
      );
    } catch (error) {
      console.error('Media picker error:', error);
      Alert.alert(
        'Error',
        error.message || 'Could not select media.',
      );
    }
  };

  const removeMedia = index => {
    if (publishing) {
      return;
    }

    setSelectedMedia(current =>
      current.filter((_, i) => i !== index),
    );
  };

  const uploadMedia = async () => {
    if (selectedMedia.length === 0) {
      return [];
    }

    const formData = new FormData();

    selectedMedia.forEach((asset, index) => {
      const fallbackName = `announcement_${Date.now()}_${index}`;

      const uri = asset.uri;

      const name =
        asset.fileName ||
        uri.split('/').pop() ||
        fallbackName;

      formData.append('files', {
        uri,
        name,
        type: asset.type || 'application/octet-stream',
      });
    });

    const response = await fetch(
      `${API_BASE_URL}/upload-announcement-media`,
      {
        method: 'POST',
        body: formData,
      },
    );

    const data = await response.json();

    console.log('Announcement upload response:', data);
    console.log('Selected media count:', selectedMedia.length);
    console.log('Uploaded media count:', data.files?.length);

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          data.error ||
          'Media upload failed.',
      );
    }

    if (
      !Array.isArray(data.files) ||
      data.files.length !== selectedMedia.length
    ) {
      throw new Error(
        `Upload count mismatch. Selected: ${selectedMedia.length}, Uploaded: ${
          data.files?.length || 0
        }`,
      );
    }

    return data.files.map((file, index) => ({
      hubspot_file_id: String(file.id),
      url: file.url,
      file_name:
        file.name ||
        selectedMedia[index].fileName ||
        `announcement_media_${index + 1}`,
      media_type:
        file.type ||
        (selectedMedia[index].type?.startsWith('video/')
          ? 'video'
          : 'image'),
    }));
  };

  const handlePublish = async () => {
    if (publishing) {
      return;
    }

    if (!title.trim() || !description.trim()) {
      Alert.alert(
        'Required',
        'Please enter title and description.',
      );
      return;
    }

    if (!isAdmin) {
      Alert.alert(
        'Access denied',
        'Only admins can publish announcements.',
      );
      return;
    }

    try {
      setPublishing(true);

      // Step 1: Upload selected images/videos to HubSpot.
      const media = await uploadMedia();

      // Step 2: Create announcement in the shared backend.
      const response = await fetch(
        `${API_BASE_URL}/announcements`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            userEmail,
            userName: `${firstName} ${lastName}`.trim(),
            media,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Could not publish announcement.',
        );
      }

      Alert.alert(
        'Success',
        'Announcement published successfully!',
      );

      setTitle('');
      setDescription('');
      setSelectedMedia([]);
    } catch (error) {
      console.error('Publish announcement error:', error);

      Alert.alert(
        'Publish failed',
        error.message ||
          'Please check the backend connection.',
      );
    } finally {
      setPublishing(false);
    }
  };

  if (loadingUser) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
        <Text allowFontScaling={false} style={styles.loadingText}>
          Loading user details...
        </Text>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.center}>
        <Text allowFontScaling={false} style={styles.errorText}>
          You do not have permission to create announcements.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text allowFontScaling={false} style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBackButton}>
            <Image
              source={require('../../images/left_arrow.png')}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>

          <Text
            allowFontScaling={false}
            style={styles.headerTitle}>
            Announcements
          </Text>
        </View>

        <Text allowFontScaling={false} style={styles.subheading}>
          Create a news update for dealers and customers.
        </Text>

        {/* Title */}
        <Text allowFontScaling={false} style={styles.label}>
          Announcement Title *
        </Text>

        <TextInput
          style={styles.input}
          allowFontScaling={false}
          placeholder="Enter announcement title"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
          editable={!publishing}
          autoCapitalize="sentences"
        />

        {/* Description */}
        <Text allowFontScaling={false} style={styles.label}>
          Description *
        </Text>

        <TextInput
          style={[styles.input, styles.description]}
          allowFontScaling={false}
          placeholder="Write your announcement..."
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          editable={!publishing}
        />

        {/* Add Media */}
        <TouchableOpacity
          style={[
            styles.mediaButton,
            publishing && styles.disabledButton,
          ]}
          onPress={handlePickMedia}
          disabled={publishing}>
          <Text allowFontScaling={false} style={styles.mediaButtonText}>
            + Add Image / Video
          </Text>
        </TouchableOpacity>

        {/* Selected Media */}
        {selectedMedia.length > 0 && (
          <View style={styles.mediaSection}>
            <Text allowFontScaling={false} style={styles.mediaHeading}>
              Selected Media ({selectedMedia.length}/{MAX_FILES})
            </Text>

            {selectedMedia.map((asset, index) => {
              const isVideo =
                asset.type?.startsWith('video/');

              return (
                <View
                  key={`${asset.uri}-${index}`}
                  style={styles.mediaItem}>

                  {isVideo ? (
                    <View style={styles.videoPreview}>
                      <Text style={styles.videoIcon}>▶</Text>
                      <Text allowFontScaling={false} style={styles.videoLabel}>
                        Video
                      </Text>
                    </View>
                  ) : (
                    <Image
                      source={{uri: asset.uri}}
                      style={styles.mediaPreview}
                      resizeMode="cover"
                    />
                  )}

                  <View style={styles.mediaInfo}>
                    <Text
                      allowFontScaling={false}
                      style={styles.mediaName}
                      numberOfLines={2}>
                      {asset.fileName ||
                        `Media ${index + 1}`}
                    </Text>

                    <Text allowFontScaling={false} style={styles.mediaType}>
                      {isVideo ? 'Video' : 'Image'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeMedia(index)}
                    disabled={publishing}>
                    <Text allowFontScaling={false} style={styles.removeButtonText}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <Text allowFontScaling={false} style={styles.limitText}>
          You can upload up to {MAX_FILES} images or videos.
        </Text>

        {/* Publish */}
        <TouchableOpacity
          style={[
            styles.publishButton,
            publishing && styles.disabledButton,
          ]}
          onPress={handlePublish}
          disabled={publishing}>

          {publishing ? (
            <View style={styles.publishingRow}>
              <ActivityIndicator
                size="small"
                color="#000"
              />

              <Text allowFontScaling={false} style={styles.publishButtonText}>
                Publishing...
              </Text>
            </View>
          ) : (
            <Text allowFontScaling={false} style={styles.publishButtonText}>
              Publish Announcement
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default Announcements;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 25,
    paddingBottom: 50,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 5,
  },

  headerBackButton: {
    marginRight: 15,
    padding: 5,
  },

  arrowIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    transform: [{rotate: '180deg'}],
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },

  subheading: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 25,
    lineHeight: 22,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },

  description: {
    minHeight: 130,
    paddingTop: 14,
    textAlignVertical: 'top',
  },

  mediaButton: {
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  mediaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },

  mediaSection: {
    marginTop: 5,
    marginBottom: 15,
  },

  mediaHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },

  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },

  mediaPreview: {
    width: 65,
    height: 65,
    borderRadius: 6,
    backgroundColor: '#DDDDDD',
  },

  videoPreview: {
    width: 65,
    height: 65,
    borderRadius: 6,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
  },

  videoIcon: {
    color: '#FFFFFF',
    fontSize: 22,
  },

  videoLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 3,
  },

  mediaInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  mediaName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
  },

  mediaType: {
    fontSize: 12,
    color: '#777777',
    marginTop: 5,
  },

  removeButton: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },

  removeButtonText: {
    color: '#CC0000',
    fontSize: 12,
    fontWeight: '600',
  },

  limitText: {
    fontSize: 12,
    color: '#777777',
    marginBottom: 25,
  },

  publishButton: {
    backgroundColor: '#FFEA00',
    paddingVertical: 17,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  publishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },

  publishingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  disabledButton: {
    opacity: 0.6,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },

  loadingText: {
    fontSize: 15,
    color: '#666666',
    marginTop: 12,
  },

  errorText: {
    fontSize: 16,
    color: '#CC0000',
    textAlign: 'center',
  },

  backButton: {
    backgroundColor: '#FFEA00',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },

  backButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
});
