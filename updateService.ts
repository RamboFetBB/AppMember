import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Alert } from 'react-native';

// Substitua SEU_USUARIO pelo seu usuário/organização do GitHub
const GITHUB_REPO = 'rambofetbb/AppMember'; 

export async function checkAndInstallApkUpdate(
  onProgress?: (progressPercent: number) => void
): Promise<void> {
  try {
    // 1. Consulta a última release publicada no repositório
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    
    if (!response.ok) {
      throw new Error('Não foi possível verificar releases no GitHub.');
    }

    const data = await response.json();
    const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));

    if (!apkAsset) {
      Alert.alert('Atualização', 'Nenhum arquivo APK foi encontrado na última release.');
      return;
    }

    const apkUrl = apkAsset.browser_download_url;
    const fileUri = `${FileSystem.documentDirectory}update.apk`;

    // 2. Configura o download com acompanhamento de progresso
    const downloadResumable = FileSystem.createDownloadResumable(
      apkUrl,
      fileUri,
      {},
      (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) {
          onProgress(Math.round(progress * 100));
        }
      }
    );

    // 3. Executa o download
    const result = await downloadResumable.downloadAsync();
    if (!result || !result.uri) {
      throw new Error('Falha ao baixar o arquivo da atualização.');
    }

    // 4. Converte a URI para o formato exigido pelo Intent Launcher do Android
    const contentUri = await FileSystem.getContentUriAsync(result.uri);

    // 5. Invocação do instalador de pacotes padrão do Android
    await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
      data: contentUri,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    });
  } catch (error: any) {
    Alert.alert('Erro na Atualização', error.message || 'Ocorreu um erro ao atualizar o aplicativo.');
  }
}
