import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity,
  ActivityIndicator 
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Button } from './Button';
import { AlertTriangle, Trash2, X, AlertCircle, HelpCircle } from 'lucide-react-native';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  itemDetail?: string;
  consequence?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning' | 'accent' | 'success';
  iconType?: 'danger' | 'warning' | 'info';
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  itemDetail,
  consequence,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  iconType = 'danger',
  isProcessing = false,
  onConfirm,
  onCancel,
}) => {
  const { colors } = useTheme();

  const buttonVariant = confirmVariant === 'warning' ? 'accent' : confirmVariant;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={isProcessing ? undefined : onCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.dialogCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={[
              styles.iconWrap, 
              { 
                backgroundColor: iconType === 'danger' 
                  ? colors.dangerLight 
                  : iconType === 'warning' 
                  ? colors.warningLight 
                  : colors.accentLight 
              }
            ]}>
              {iconType === 'danger' ? (
                <Trash2 size={20} color={colors.danger} />
              ) : iconType === 'warning' ? (
                <AlertTriangle size={20} color={colors.warning} />
              ) : (
                <HelpCircle size={20} color={colors.accent} />
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.titleText, { color: colors.textPrimary }]}>{title}</Text>
            </View>

            {!isProcessing && (
              <TouchableOpacity onPress={onCancel} style={[styles.closeBtn, { backgroundColor: colors.backgroundSoft }]}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Body */}
          <View style={styles.bodyContainer}>
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>
              {message}
            </Text>

            {itemDetail ? (
              <View style={[styles.itemCard, { backgroundColor: colors.backgroundSoft, borderColor: colors.border }]}>
                <Text style={[styles.itemDetailText, { color: colors.textPrimary }]}>
                  {itemDetail}
                </Text>
              </View>
            ) : null}

            {consequence ? (
              <View style={styles.consequenceRow}>
                <AlertCircle size={14} color={iconType === 'danger' ? colors.danger : colors.warning} />
                <Text style={[styles.consequenceText, { color: iconType === 'danger' ? colors.dangerText : colors.warningText }]}>
                  {consequence}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Action Buttons */}
          <View style={[styles.actionsRow, { borderTopColor: colors.borderLight }]}>
            <Button
              title={cancelText}
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onPress={onCancel}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title={isProcessing ? 'Processing...' : confirmText}
              variant={buttonVariant}
              size="sm"
              disabled={isProcessing}
              icon={isProcessing ? <ActivityIndicator size="small" color="#FFF" /> : undefined}
              onPress={onConfirm}
              style={{ flex: 1 }}
            />
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyContainer: {
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemCard: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemDetailText: {
    fontSize: 14,
    fontWeight: '600',
  },
  consequenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  consequenceText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
