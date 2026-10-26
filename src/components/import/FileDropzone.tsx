import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { AcademicTheme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { UploadCloud, FileSpreadsheet, AlertCircle } from 'lucide-react-native';

export interface FileDropzoneProps {
  onFileLoaded: (data: ArrayBuffer | string, filename: string, fileSize: number) => void;
  disabled?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ onFileLoaded, disabled = false }) => {
  const { colors, isDark } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processWebFile = (file: File) => {
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      setError('Please select a valid .xlsx, .xls, or .csv spreadsheet file.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('File size exceeds the 20MB maximum limit.');
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    if (ext === 'csv') {
      reader.onload = (e) => {
        setLoading(false);
        const text = e.target?.result as string;
        if (text) {
          onFileLoaded(text, file.name, file.size);
        }
      };
      reader.onerror = () => {
        setLoading(false);
        setError('Failed to read file content.');
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        setLoading(false);
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          onFileLoaded(buffer, file.name, file.size);
        }
      };
      reader.onerror = () => {
        setLoading(false);
        setError('Failed to read binary file content.');
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleMobilePick = async () => {
    setError(null);
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const ext = asset.name.split('.').pop()?.toLowerCase();
        
        if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
          setError('Selected file is not an .xlsx, .xls, or .csv document.');
          setLoading(false);
          return;
        }

        // On web / fetchable native uri
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        processWebFile(new File([blob], asset.name, { type: blob.type }));
      }
    } catch (err: any) {
      setError(`Failed to pick document: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWebFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processWebFile(file);
    }
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    } else {
      handleMobilePick();
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleWebFileChange as any}
        />
      )}

      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        // @ts-ignore
        onDragOver={(e: any) => {
          if (Platform.OS === 'web') {
            e.preventDefault();
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e: any) => {
          if (Platform.OS === 'web') {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer?.files?.[0];
            if (file) processWebFile(file);
          }
        }}
        style={[
          styles.dropzone,
          {
            backgroundColor: isDragging ? colors.accentLight : (isDark ? colors.backgroundSoft : colors.backgroundSoft),
            borderColor: isDragging ? colors.accent : (isDark ? colors.border : colors.cardBorder),
          }
        ]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Reading spreadsheet...</Text>
          </View>
        ) : (
          <View style={styles.innerContent}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
              <UploadCloud size={32} color={colors.accent} />
            </View>

            <Text style={[styles.dropTitle, { color: colors.textPrimary }]}>
              Choose a spreadsheet or drag & drop here
            </Text>

            <Text style={[styles.dropSub, { color: colors.textMuted }]}>
              Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) files up to 20MB
            </Text>

            <View style={[styles.browseBtn, { backgroundColor: colors.accent }]}>
              <FileSpreadsheet size={16} color="#FFF" />
              <Text style={styles.browseBtnText}>Browse Files</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder }]}>
          <AlertCircle size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.dangerText }]}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: AcademicTheme.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.medium,
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dropTitle: {
    fontSize: AcademicTheme.typography.sizes.md,
    fontWeight: AcademicTheme.typography.weights.semibold,
    textAlign: 'center',
    marginBottom: 4,
  },
  dropSub: {
    fontSize: AcademicTheme.typography.sizes.xs,
    textAlign: 'center',
    maxWidth: 360,
    marginBottom: 16,
    lineHeight: 18,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: AcademicTheme.borderRadius.md,
  },
  browseBtnText: {
    color: '#FFF',
    fontSize: AcademicTheme.typography.sizes.sm,
    fontWeight: AcademicTheme.typography.weights.semibold,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: AcademicTheme.borderRadius.md,
    padding: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
});
