
import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import Video from 'react-native-video';
import ImageViewer from 'react-native-image-zoom-viewer';
import RNFS from 'react-native-fs';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';

const API_BASE_URL = 'https://syilapp-w8ye.onrender.com';

const ADMIN_EMAILS = [
  'manish.dalotra@techstriker.com',
  'fabuikema@gmail.com',
];

const AnnouncementsListing = ({navigation}) => {
  const [announcements, setAnnouncements] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likingId, setLikingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [longDescriptions, setLongDescriptions] = useState({});

  const [selectedImage, setSelectedImage] = useState(null);
  const [playingMediaId, setPlayingMediaId] = useState(null);
  const [downloadingMediaId, setDownloadingMediaId] = useState(null);

  const mediaWidth = Dimensions.get('window').width - 64;

  const isAdmin = ADMIN_EMAILS.includes(
    userEmail.trim().toLowerCase(),
  );

  // Load announcements from backend
  const loadAnnouncements = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const email = await AsyncStorage.getItem('userEmail');
      const firstName = await AsyncStorage.getItem('userFirstName');
      const lastName = await AsyncStorage.getItem('userLastName');

      setUserEmail(email || '');
      setUserName(
        `${firstName || ''} ${lastName || ''}`.trim(),
      );

      const response = await fetch(
        `${API_BASE_URL}/announcements?userEmail=${encodeURIComponent(
          email || '',
        )}`,
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to load announcements',
        );
      }

      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Load announcements error:', error);

      Alert.alert(
        'Error',
        error.message || 'Unable to load announcements.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh when screen opens
  useFocusEffect(
    useCallback(() => {
      loadAnnouncements();

      return () => {
        setPlayingMediaId(null);
      };
    }, []),
  );

  // Read More / Read Less
  const toggleDescription = id => {
    setExpandedDescriptions(current => ({
      ...current,
      [id]: !current[id],
    }));
  };

  // Like / Unlike
  const handleLike = async item => {
    if (!userEmail || likingId !== null) {
      if (!userEmail) {
        Alert.alert(
          'Error',
          'User email not found. Please login again.',
        );
      }
      return;
    }

    setLikingId(item.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/announcements/${item.id}/like`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userEmail,
            userName,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Could not update like',
        );
      }

      setAnnouncements(current =>
        current.map(announcement =>
          String(announcement.id) === String(item.id)
            ? {
                ...announcement,
                like_count: data.likeCount,
                liked_by_me: data.liked,
              }
            : announcement,
        ),
      );
    } catch (error) {
      console.error('Announcement like error:', error);

      Alert.alert(
        'Error',
        error.message || 'Unable to update like.',
      );
    } finally {
      setLikingId(null);
    }
  };

  // Open Edit Modal
  const openEditModal = item => {
    setEditingAnnouncement(item);
    setEditTitle(item.title || '');
    setEditDescription(item.description || '');
  };

  const closeEditModal = () => {
    if (saving) {
      return;
    }

    setEditingAnnouncement(null);
    setEditTitle('');
    setEditDescription('');
  };

  // Save Edited Announcement
  const handleSaveEdit = async () => {
    if (!editingAnnouncement || saving) {
      return;
    }

    if (!isAdmin) {
      Alert.alert(
        'Access denied',
        'Only admins can edit announcements.',
      );
      return;
    }

    if (!editTitle.trim() || !editDescription.trim()) {
      Alert.alert(
        'Required fields',
        'Please enter both title and description.',
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/announcements/${editingAnnouncement.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userEmail,
            title: editTitle.trim(),
            description: editDescription.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to update announcement',
        );
      }

      setAnnouncements(current =>
        current.map(item =>
          String(item.id) === String(editingAnnouncement.id)
            ? {
                ...item,
                title:
                  data.announcement?.title ??
                  editTitle.trim(),
                description:
                  data.announcement?.description ??
                  editDescription.trim(),
                updated_at:
                  data.announcement?.updated_at ??
                  item.updated_at,
              }
            : item,
        ),
      );

      setExpandedDescriptions(current => ({
        ...current,
        [editingAnnouncement.id]: false,
      }));

      setLongDescriptions(current => ({
        ...current,
        [editingAnnouncement.id]: false,
      }));

      setEditingAnnouncement(null);
      setEditTitle('');
      setEditDescription('');

      Alert.alert(
        'Success',
        'Announcement updated successfully.',
      );
    } catch (error) {
      console.error('Edit announcement error:', error);

      Alert.alert(
        'Update failed',
        error.message || 'Unable to update announcement.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete Confirmation
  const handleDelete = item => {
    if (!isAdmin) {
      Alert.alert(
        'Access denied',
        'Only admins can delete announcements.',
      );
      return;
    }

    Alert.alert(
      'Delete announcement?',
      `Are you sure you want to delete "${item.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(item),
        },
      ],
    );
  };

  // Delete Announcement
  const confirmDelete = async item => {
    if (deletingId !== null) {
      return;
    }

    setDeletingId(item.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/announcements/${item.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({userEmail}),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to delete announcement',
        );
      }

      setAnnouncements(current =>
        current.filter(
          announcement =>
            String(announcement.id) !== String(item.id),
        ),
      );

      Alert.alert(
        'Success',
        'Announcement deleted successfully.',
      );
    } catch (error) {
      console.error('Delete announcement error:', error);

      Alert.alert(
        'Delete failed',
        error.message || 'Unable to delete announcement.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Open Image Zoom
  const openImage = url => {
    setSelectedImage(url);
  };

  // Download Image / Video to iPhone Photos
  const downloadMedia = async (
    file,
    announcementId,
    index,
  ) => {
    const url = file.url || file.media_url;

    const mediaType = String(
      file.media_type || file.type || 'image',
    ).toLowerCase();

    const isVideo =
      mediaType === 'video' ||
      mediaType.startsWith('video/');

    const mediaId = `${announcementId}-${file.id || index}`;

    if (!url) {
      Alert.alert(
        'Download failed',
        'Media URL is not available.',
      );
      return;
    }

    let localPath = null;

    try {
      setDownloadingMediaId(mediaId);

      const cleanUrl = url.split('?')[0];

      const urlExtension = cleanUrl.includes('.')
        ? cleanUrl
            .substring(cleanUrl.lastIndexOf('.') + 1)
            .toLowerCase()
        : '';

      const validExtensions = isVideo
        ? ['mp4', 'mov', 'm4v']
        : ['jpg', 'jpeg', 'png', 'heic', 'webp'];

      const safeExtension = validExtensions.includes(
        urlExtension,
      )
        ? urlExtension
        : isVideo
          ? 'mp4'
          : 'jpg';

      const fileName = `SYIL_Announcement_${Date.now()}.${safeExtension}`;

      localPath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      const result = await RNFS.downloadFile({
        fromUrl: url,
        toFile: localPath,
      }).promise;

      if (
        result.statusCode < 200 ||
        result.statusCode >= 300
      ) {
        throw new Error(
          `Download failed (HTTP ${result.statusCode}).`,
        );
      }

      await CameraRoll.save(`file://${localPath}`, {
        type: isVideo ? 'video' : 'photo',
        album: 'SYIL Announcements',
      });

      Alert.alert(
        'Downloaded',
        'Media has been saved to your Photos app.',
      );
    } catch (error) {
      console.error(
        'Announcement media download error:',
        error,
      );

      Alert.alert(
        'Download failed',
        error.message || 'Unable to save media.',
      );
    } finally {
      if (localPath) {
        await RNFS.unlink(localPath).catch(() => {});
      }

      setDownloadingMediaId(null);
    }
  };

  // Render Images / Videos
  const renderMedia = announcement => {
    const media = Array.isArray(announcement.media)
      ? announcement.media
      : [];

    const validMedia = media.filter(
      file => file.url || file.media_url,
    );

    if (validMedia.length === 0) {
      return null;
    }

    return (
      <View style={styles.mediaContainer}>
        <FlatList
          data={validMedia}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(file, index) =>
            String(file.id || `${announcement.id}-${index}`)
          }
          snapToInterval={mediaWidth + 10}
          decelerationRate="fast"
          disableIntervalMomentum
          onScrollBeginDrag={() => setPlayingMediaId(null)}
          renderItem={({item: file, index}) => {
            const url = file.url || file.media_url;

            const rawType = String(
              file.media_type || file.type || 'image',
            ).toLowerCase();

            const isVideo =
              rawType === 'video' ||
              rawType.startsWith('video/');

            const mediaId = `${announcement.id}-${file.id || index}`;

            const isPlaying =
              playingMediaId === mediaId;

            const isDownloading =
              downloadingMediaId === mediaId;

            return (
              <View
                style={[
                  styles.mediaSlide,
                  {width: mediaWidth},
                ]}>

                {isVideo ? (
                  <View style={styles.videoFrame}>
                    <Video
                      source={{uri: url}}
                      style={styles.mediaContent}
                      resizeMode="contain"
                      controls={isPlaying}
                      paused={!isPlaying}
                      onEnd={() =>
                        setPlayingMediaId(null)
                      }
                      onError={error => {
                        console.log(
                          'Video playback error:',
                          error,
                        );

                        setPlayingMediaId(null);

                        Alert.alert(
                          'Video error',
                          'Unable to play this video.',
                        );
                      }}
                    />

                    {!isPlaying && (
                      <TouchableOpacity
                        style={styles.videoPlayOverlay}
                        activeOpacity={0.85}
                        onPress={() =>
                          setPlayingMediaId(mediaId)
                        }>
                        <Text allowFontScaling={false} style={styles.playIcon}>
                          ▶
                        </Text>

                        <Text allowFontScaling={false} style={styles.videoLabel}>
                          Play video
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => openImage(url)}>
                    <Image
                      source={{uri: url}}
                      style={styles.mediaContent}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.downloadButton}
                  activeOpacity={0.8}
                  disabled={isDownloading}
                  onPress={() =>
                    downloadMedia(
                      file,
                      announcement.id,
                      index,
                    )
                  }>

                  {isDownloading ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                    allowFontScaling={false}
                      style={styles.downloadButtonText}>
                      ↓ Download
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />

        {validMedia.length > 1 && (
          <Text allowFontScaling={false} style={styles.mediaHint}>
            Swipe left or right to view{' '}
            {validMedia.length} files
          </Text>
        )}
      </View>
    );
  };

  // Render Announcement Card
  const renderAnnouncement = ({item}) => {
    const liked = item.liked_by_me === true;

    const isExpanded =
      expandedDescriptions[item.id] === true;

    const isLong =
      longDescriptions[item.id] === true;

    return (
      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.title}>
          {item.title}
        </Text>

        {/* Description */}
        <View style={styles.descriptionWrapper}>
          <Text allowFontScaling={false}
            style={styles.hiddenDescription}
            onTextLayout={event => {
              const hasMoreThanThreeLines =
                event.nativeEvent.lines.length > 3;

              setLongDescriptions(current => {
                if (
                  current[item.id] ===
                  hasMoreThanThreeLines
                ) {
                  return current;
                }

                return {
                  ...current,
                  [item.id]: hasMoreThanThreeLines,
                };
              });
            }}>
            {item.description || ''}
          </Text>

          <Text
            allowFontScaling={false}
            style={styles.description}
            numberOfLines={
              isExpanded ? undefined : 3
            }>
            {item.description || ''}
          </Text>
        </View>

        {isLong && (
          <TouchableOpacity
            onPress={() =>
              toggleDescription(item.id)
            }
            activeOpacity={0.7}>
            <Text allowFontScaling={false} style={styles.readMoreText}>
              {isExpanded
                ? 'Read Less'
                : 'Read More'}
            </Text>
          </TouchableOpacity>
        )}

        {renderMedia(item)}

        {/* Like and Date */}
        <View style={styles.footer}>
          <View style={styles.likeSection}>
            <TouchableOpacity
              style={[
                styles.likeButton,
                liked && styles.likedButton,
              ]}
              onPress={() => handleLike(item)}
              disabled={
                likingId !== null ||
                deletingId !== null
              }>

              <Text allowFontScaling={false} style={styles.likeText}>
                <Text allowFontScaling={false} style={{ color: 'red' }}>
                  {liked ? '♥' : '♡'}
                </Text>
                {' '}{liked ? 'Liked' : 'Like'}
              </Text> 
            </TouchableOpacity>

            <Text allowFontScaling={false} style={styles.likeCount}>
              {item.like_count || 0}{' '}
              {Number(item.like_count) === 1
                ? 'Like'
                : 'Likes'}
            </Text>

            {likingId !== null &&
              String(likingId) ===
                String(item.id) && (
                <ActivityIndicator size="small" />
              )}
          </View>

          <Text allowFontScaling={false} style={styles.date}>
            {item.created_at
              ? new Date(
                  item.created_at,
                ).toLocaleDateString()
              : ''}
          </Text>
        </View>

        {/* Admin Actions */}
        {isAdmin && (
          <View style={styles.adminActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                openEditModal(item)
              }
              disabled={
                saving ||
                deletingId !== null
              }>
              <Text allowFontScaling={false} style={styles.editButtonText}>
                ✎ Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() =>
                handleDelete(item)
              }
              disabled={
                deletingId !== null ||
                saving
              }>

              {deletingId !== null &&
              String(deletingId) ===
                String(item.id) ? (
                <ActivityIndicator
                  size="small"
                  color="#000000"
                />
              ) : (
                <Text allowFontScaling={false} style={styles.deleteButtonText}>
                  Delete
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Loading Screen
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#000000"
        />

        <Text allowFontScaling={false} style={styles.loadingText}>
          Loading announcements...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}>

          <Image
            source={require('../../images/left_arrow.png')}
            style={styles.arrowIcon}
          />
        </TouchableOpacity>

        <Text
          allowFontScaling={false}
          style={styles.headerTitle}>
          Announcements Listing
        </Text>
      </View>

      {/* Announcements */}
      <FlatList
        data={announcements}
        keyExtractor={item =>
          String(item.id)
        }
        renderItem={renderAnnouncement}
        contentContainerStyle={
          announcements.length === 0
            ? styles.emptyContainer
            : styles.list
        }
        ListEmptyComponent={
          <Text allowFontScaling={false} style={styles.emptyText}>
            No announcements available.
          </Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAnnouncements(false);
            }}
          />
        }
      />

      {/* Image Zoom Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setSelectedImage(null)
        }>

        <View style={styles.imageViewerContainer}>
          {selectedImage && (
            <ImageViewer
              imageUrls={[
                {url: selectedImage},
              ]}
              enableSwipeDown
              onSwipeDown={() =>
                setSelectedImage(null)
              }
              saveToLocalByLongPress={false}
              backgroundColor="#000000"
              renderIndicator={() => null}
            />
          )}

          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() =>
              setSelectedImage(null)
            }>
            <Text
              allowFontScaling={false}
              style={styles.imageViewerCloseText}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit Announcement Modal */}
      <Modal
        visible={!!editingAnnouncement}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}>

        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }>

          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled">

              <Text allowFontScaling={false} style={styles.modalTitle}>
                Edit Announcement
              </Text>

              <Text allowFontScaling={false} style={styles.inputLabel}>
                Title
              </Text>

              <TextInput
                style={styles.input}
                allowFontScaling={false}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Enter announcement title"
                placeholderTextColor="#8993A4"
                maxLength={200}
                editable={!saving}
              />

              <Text allowFontScaling={false} style={styles.inputLabel}>
                Description
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.descriptionInput,
                ]}
                allowFontScaling={false}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Enter announcement description"
                placeholderTextColor="#8993A4"
                multiline
                textAlignVertical="top"
                editable={!saving}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeEditModal}
                  disabled={saving}>
                  <Text
                    allowFontScaling={false}
                    style={styles.cancelButtonText}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveEdit}
                  disabled={saving}>

                  {saving ? (
                    <ActivityIndicator
                      color="#000000"
                    />
                  ) : (
                    <Text
                      allowFontScaling={false}
                      style={styles.saveButtonText}>
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default AnnouncementsListing;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
    paddingHorizontal: 16,
  },

  header: {
    height: 65,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  headerBackButton: {
    padding: 5,
    marginRight: 12,
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
    flex: 1,
  },

  list: {
    paddingBottom: 30,
  },

  card: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E1E6EF',
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },

  descriptionWrapper: {
    position: 'relative',
    marginTop: 10,
  },

  description: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
  },

  hiddenDescription: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
    fontSize: 15,
    lineHeight: 22,
  },

  readMoreText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
    textDecorationLine: 'underline',
  },

  mediaContainer: {
    marginTop: 12,
  },

  mediaSlide: {
    height: 240,
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },

  videoFrame: {
    flex: 1,
    backgroundColor: '#000000',
  },

  mediaContent: {
    width: '100%',
    height: 240,
    backgroundColor: '#000000',
  },

  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  playIcon: {
    fontSize: 42,
    color: '#FFFFFF',
  },

  videoLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 6,
    fontWeight: '600',
  },

  downloadButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 92,
    alignItems: 'center',
  },

  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  mediaHint: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 12,
    marginTop: 8,
  },

  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  imageViewerClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 20,
    right: 20,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },

  imageViewerCloseText: {
    color: '#FFFFFF',
    fontSize: 22,
  },

  date: {
    color: '#505050',
    fontSize: 12,
    textAlign: 'right',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  likeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  likeButton: {
    borderWidth: 1,
    borderColor: '#B3B3B3',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  likedButton: {
    backgroundColor: '#FFFFFF',
  },

  likeText: {
    color: '#000000',
    fontWeight: '400',
  },

  likedText: {
    color: '#000000',
  },

  likeCount: {
    color: '#000000',
    fontWeight: '400',
  },

  adminActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1E6EF',
  },

  editButton: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 100,
    paddingVertical: 7,
    paddingHorizontal: 18,
  },

  editButtonText: {
    color: '#000000',
    fontWeight: '500',
  },

  deleteButton: {
    backgroundColor: '#FFEA00',
    borderRadius: 100,
    paddingVertical: 7,
    paddingHorizontal: 18,
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteButtonText: {
    color: '#000000',
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    maxHeight: '85%',
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
  },

  inputLabel: {
    color: '#344563',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 7,
  },

  input: {
    borderWidth: 1,
    borderColor: '#C1C7D0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#000000',
    marginBottom: 16,
  },

  descriptionInput: {
    minHeight: 130,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },

  cancelButton: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 100,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },

  cancelButtonText: {
    color: '#000000',
    fontWeight: '600',
  },

  saveButton: {
    backgroundColor: '#FFEA00',
    borderRadius: 100,
    paddingVertical: 11,
    paddingHorizontal: 16,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonText: {
    color: '#000000',
    fontWeight: '600',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  loadingText: {
    marginTop: 12,
    color: '#44546F',
  },

  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    color: '#68778D',
    fontSize: 15,
  },
});
