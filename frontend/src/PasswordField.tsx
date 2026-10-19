import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { Field } from './ui';
import { colors } from './theme';

export const PasswordField = React.forwardRef<TextInput, TextInputProps>(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ justifyContent: 'center' }}>
      <Field
        ref={ref}
        {...props}
        secureTextEntry={!visible}
        style={[props.style, { paddingRight: 52 }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
        onPress={() => setVisible((current) => !current)}
        hitSlop={10}
        style={{ position: 'absolute', right: 14, padding: 6 }}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
});
