"use client";
import React, { useState, useContext, useEffect } from 'react';
import { Box, Typography, TextField, Switch, Divider } from '@mui/material';
import { alpha } from '@mui/material/styles';
import FileUploadComponent from '../../uploads/FileUploadComponent';
import useFont from '@/hooks/useFont';
import { LanguageContext } from "@/components/contexts/LanguageContext";

// ============================================================================
// TEXT LABELS CONFIGURATION
// ============================================================================
const TEXT_LABELS = {
  manualUrlInput: {
    en: 'Manual URL Input',
    cn: '手动输入图片URL'
  },
  uploadImage: {
    en: 'Upload Image', 
    cn: '上传图片'
  },
  chooseInstruction: {
    en: 'Select Image URL or Upload',
    cn: '选择图片URL或上传'
  },
  imageUrlPlaceholder: {
    en: 'Enter image URL...',
    cn: '请输入图片URL...'
  },
  uploadedImageUrl: {
    en: 'Image URL',
    cn: '图片URL'
  },
  imageUrlNote: {
    en: 'You can use this image URL in your content. GIFs will display with animation.',
    cn: '您可以在内容中使用此图片URL。GIF将显示动画效果。'
  },
  imagePreviewAlt: {
    en: 'Image preview',
    cn: '图片预览'
  },
  clickToViewFull: {
    en: 'Click to view full size',
    cn: '点击查看大图'
  },
  imageLoadFailed: {
    en: 'Image failed to load',
    cn: '图片加载失败'
  },
  rules: {
    en: 'WEBP only · max 800KB · name it Year_Title_No (e.g. 2021_Red_Forest_01.webp)',
    cn: '仅支持 WEBP · 不超过 800KB · 命名 Year_Title_No（例：2021_Red_Forest_01.webp）'
  },
  manualUrlHint: {
    en: 'How to fill in:\n1. Right-click the image → "Copy image address" (or open it in a new tab and copy the address bar link);\n2. Paste it into the box above — the link must start with http:// or https://;\n3. A thumbnail appears below when the link works.\nYou can also switch to "Upload Image" to pick a local WEBP file.',
    cn: '填写说明：\n1. 在网页图片上点右键 →「复制图片地址」（或在新标签页打开图片，复制地址栏链接）；\n2. 粘贴到上方输入框，链接需以 http:// 或 https:// 开头；\n3. 下方出现缩略图，说明链接可用。\n也可以切换为「上传图片」，直接选择本地 WEBP 文件。'
  },
  uploadHint: {
    en: 'Upload rules: WEBP only · one file max 800KB · name it Year_Title_No (e.g. 2021_Red_Forest_01.webp).',
    cn: '上传说明：仅支持 WEBP 格式 · 单个文件不超过 800KB · 命名格式为 年份_标题_编号（例：2021_Red_Forest_01.webp）。'
  }
};

const getText = (key, isCn = false) => {
  const textObj = TEXT_LABELS[key];
  if (!textObj) return '';
  return isCn ? textObj.cn : textObj.en;
};

// ============================================================================
// MAIN COMPONENT - FIXED VERSION
// ============================================================================
const ImageUploadSection = ({
  title,
  imgUrl,
  onUploadSuccess,
  onUploadError,
  disabled = false,
  getLabel,
  register,
  fieldName,
  onImageUrlChange,
  form,
  colors,
  naming = null,
}) => {
  const { inputFontFamily } = useFont();
  const { isCn } = useContext(LanguageContext);
  
  // Simple state management
  const [isManualInput, setIsManualInput] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');

  // getLabel() returns the raw key when a key is missing from the registry,
  // so a missing entry used to leak "uploadImage" into the UI. Fall back to
  // the local TEXT_LABELS whenever the lookup has no real translation.
  const pickLabel = (key) => {
    const fromRegistry = getLabel?.(key);
    return fromRegistry && fromRegistry !== key ? fromRegistry : getText(key, isCn);
  };

  // Get labels
  const labels = {
    manualUrlInput: pickLabel('manualUrlInput'),
    uploadImage: pickLabel('uploadImage'),
    chooseInstruction: pickLabel('chooseInstruction'),
    imageUrlPlaceholder: pickLabel('imageUrlPlaceholder'),
    uploadedImageUrl: pickLabel('uploadedImageUrl'),
    imageUrlNote: pickLabel('imageUrlNote'),
    imagePreviewAlt: pickLabel('imagePreviewAlt'),
    clickToViewFull: pickLabel('clickToViewFull'),
    imageLoadFailed: pickLabel('imageLoadFailed'),
    rules: getLabel?.('imageRules') || getText('rules', isCn),
  };

  const actualFieldName = fieldName || (register?.name) || 'image_url';

  // FIXED: Only sync on initial mount or when imgUrl changes from external source
  // Use a ref to track if we're typing to prevent sync during user input
  const [isUserTyping, setIsUserTyping] = useState(false);

  useEffect(() => {
    // Only update if not typing and the imgUrl is different from currentUrl
    if (!isUserTyping && imgUrl !== undefined && imgUrl !== currentUrl) {
      setCurrentUrl(imgUrl || '');
    }
  }, [imgUrl]); // Removed currentUrl and isUserTyping from dependencies

  // Simple event handlers
  const setManualMode = (next) => {
    if (disabled || next === isManualInput) return;
    setIsManualInput(next);
    if (!next) {
      setCurrentUrl('');
      if (form?.setValue) {
        form.setValue(actualFieldName, '');
      }
      if (onImageUrlChange) {
        onImageUrlChange('');
      }
    }
  };

  const handleToggleChange = (event) => setManualMode(event.target.checked);

  const handleManualUrlChange = (event) => {
    const url = event.target.value;
    
    // Mark that user is typing
    setIsUserTyping(true);
    
    // Update local state immediately for responsive input
    setCurrentUrl(url);
    
    // Update form if provided
    if (form?.setValue) {
      form.setValue(actualFieldName, url, { shouldValidate: false, shouldDirty: true });
    }
    
    // Call callback if provided
    if (onImageUrlChange) {
      onImageUrlChange(url);
    }
  };

  // Reset typing flag after user stops typing
  const handleManualUrlBlur = () => {
    setIsUserTyping(false);
  };

  const handleUploadSuccess = (url) => {
    setCurrentUrl(url);
    
    // Update form if provided
    if (form?.setValue) {
      form.setValue(actualFieldName, url, { shouldValidate: false, shouldDirty: true });
    }
    
    // Call callbacks if provided
    if (onUploadSuccess) {
      onUploadSuccess(url);
    }
    if (onImageUrlChange) {
      onImageUrlChange(url);
    }
  };

  // Shared dashed "how it works" box style
  const hintBoxSx = {
    mt: 1.5,
    px: 1.5,
    py: 1.25,
    border: '1px dashed',
    borderColor: alpha(colors?.text || '#000000', 0.3),
    borderRadius: 1.5,
  };

  const hintTextSx = {
    fontFamily: inputFontFamily,
    fontSize: '12px',
    lineHeight: 1.7,
    color: colors?.text || 'black',
    opacity: 0.75,
    whiteSpace: 'pre-line',
  };

  // Both sides of the switch are always visible, so the two possible
  // states are explicit — no guessing what the toggle does.
  const modeTextSx = (active) => ({
    fontFamily: inputFontFamily,
    fontSize: '13px',
    lineHeight: 1.4,
    color: colors?.text || 'black',
    cursor: disabled ? 'default' : 'pointer',
    opacity: active ? 1 : 0.4,
    fontWeight: active ? 600 : 400,
    transition: 'opacity 0.15s ease',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  });

  return (
    <Box sx={{ mb: 4 }}>
      {/* Mode switch */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography
          component="span"
          onClick={() => setManualMode(false)}
          sx={modeTextSx(!isManualInput)}
        >
          {labels.uploadImage}
        </Typography>

        <Switch
          checked={isManualInput}
          onChange={handleToggleChange}
          disabled={disabled}
          color="default"
          size="small"
          inputProps={{ 'aria-label': `${labels.uploadImage} / ${labels.manualUrlInput}` }}
          sx={{
            '& .MuiSwitch-track': {
              backgroundColor: alpha(colors?.text || '#000000', 0.25),
              opacity: 1,
            },
            '& .MuiSwitch-thumb': {
              backgroundColor: colors?.background || '#ffffff',
              boxShadow: `0 0 0 1px ${alpha(colors?.text || '#000000', 0.35)}`,
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: colors?.text || '#000000',
              opacity: 1,
            },
          }}
        />

        <Typography
          component="span"
          onClick={() => setManualMode(true)}
          sx={modeTextSx(isManualInput)}
        >
          {labels.manualUrlInput}
        </Typography>
      </Box>

      {/* Upload Component */}
      {!isManualInput && (
        <>
          <FileUploadComponent
            onSuccess={handleUploadSuccess}
            onError={onUploadError}
            title={title}
            disabled={disabled}
            allowedTypes={['image/webp']}
            maxSize={800 * 1024}
            naming={naming}
            isCn={isCn}
          />
          <Box sx={hintBoxSx}>
            <Typography sx={hintTextSx}>{getText('uploadHint', isCn)}</Typography>
          </Box>
        </>
      )}

      {/* Manual URL Input - FIXED */}
      {isManualInput && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            value={currentUrl}
            onChange={handleManualUrlChange}
            onBlur={handleManualUrlBlur}
            placeholder={labels.imageUrlPlaceholder}
            variant="outlined"
            size="small"
            disabled={disabled}
            InputProps={{
              sx: { fontFamily: inputFontFamily, fontSize: '13px' }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontFamily: inputFontFamily,
                fontSize: '13px',
              },
            }}
          />
          <Box sx={hintBoxSx}>
            <Typography sx={hintTextSx}>{getText('manualUrlHint', isCn)}</Typography>
          </Box>
        </Box>
      )}

      {/* Image Preview */}
      {currentUrl && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: 'transparent',
            borderRadius: 2,
            border: '1px solid',
            borderColor: colors?.text || 'black',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              mb: 1,
              fontWeight: 600,
              color: colors?.text || 'black',
              fontFamily: inputFontFamily,
              fontSize: '13px',
            }}
          >
            {labels.uploadedImageUrl}
          </Typography>

          {/* Image Thumbnail */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: 2,
                overflow: 'hidden',
                border: '2px solid',
                borderColor: colors?.text || 'black',
                boxShadow: 'none',
                position: 'relative',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.05)',
                  transition: 'transform 0.2s ease-in-out',
                }
              }}
              title={labels.clickToViewFull}
            >
              <img
                src={currentUrl}
                alt={labels.imagePreviewAlt}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </Box>
          </Box>
          
          <TextField
            fullWidth
            value={currentUrl}
            variant="outlined"
            size="small"
            InputProps={{
              readOnly: true,
              sx: {
                bgcolor: 'transparent',
                fontFamily: inputFontFamily,
                fontSize: '13px',
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontFamily: inputFontFamily,
                fontSize: '13px',
              },
            }}
          />

          <Typography
            variant="caption"
            sx={{ mt: 1, display: 'block', color: 'text.secondary', fontFamily: inputFontFamily, fontSize: '13px' }}
          >
            {labels.imageUrlNote}
          </Typography>
        </Box>
      )}

      {/* Shared separator — same black rule under the uploader on every form */}
      <Divider
        sx={{
          mt: 3,
          borderBottomWidth: 1,
          borderColor: colors?.text || '#000000',
        }}
      />

      {/* Hidden input for react-hook-form */}
      {register && <input type="hidden" {...register} />}
    </Box>
  );
};

export default ImageUploadSection;

// ============================================================================
// CONFIGURATIONS
// ============================================================================
export const createImageUploadConfig = (schemaConfig) => {
  const {
    fieldName,
    title,
    defaultValue = '',
    // WEBP only, 800KB max — artist submission guidelines.
    allowedTypes = ['image/webp'],
    maxSize = 800 * 1024,
    naming = null,
  } = schemaConfig;

  if (!fieldName) {
    throw new Error('fieldName is required in schemaConfig');
  }

  return {
    fieldName,
    title,
    defaultValue,
    allowedTypes,
    maxSize,
    naming,
    createRegister: (form) => form.register(fieldName),
    createSetValue: (form) => (url) => form.setValue(fieldName, url, { shouldValidate: false, shouldDirty: true }),
    createWatch: (form) => form.watch(fieldName),
    getValue: (form) => form.getValues(fieldName),
  };
};
