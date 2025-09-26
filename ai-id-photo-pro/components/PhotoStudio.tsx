import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateIdPhoto } from '../services/geminiService';
import { UploadIcon, DownloadIcon, SparklesIcon, SpinnerIcon, WandIcon } from './icons';
import { ID_PHOTO_PROMPT } from '../constants';

const LOADING_MESSAGES = [
  'AI가 사진을 분석하고 있습니다...',
  '구도와 시선을 조정하는 중입니다...',
  '배경을 흰색으로 변경하고 있습니다...',
  '의상을 정장으로 교체하고 있습니다...',
  '스튜디오 조명을 적용하고 있습니다...',
  '최종 품질을 보정하고 있습니다...',
];

const PhotoPanel: React.FC<{ title: string; children: React.ReactNode; aspectRatioClass?: string }> = ({ title, children, aspectRatioClass }) => (
  <div className="bg-white rounded-2xl shadow-lg p-6 w-full flex-1 flex flex-col items-center">
    <h2 className="text-xl font-semibold text-slate-700 mb-4">{title}</h2>
    <div className={`w-full ${aspectRatioClass || 'aspect-[35/45]'} bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200`}>
      {children}
    </div>
  </div>
);


const PhotoStudio: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalMimeType, setOriginalMimeType] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [sizeOption, setSizeOption] = useState<'passport' | 'square' | 'custom'>('passport');
  const [customWidth, setCustomWidth] = useState<string>('35');
  const [customHeight, setCustomHeight] = useState<string>('45');
  const [generationPrompt, setGenerationPrompt] = useState<string>('');
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');


  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = LOADING_MESSAGES.indexOf(prev);
          const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
          return LOADING_MESSAGES[nextIndex];
        });
      }, 2500);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLoading]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setGeneratedImage(null);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setOriginalMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const handleGenerate = useCallback(async () => {
    if (!originalImage || !originalMimeType) {
      setError('먼저 사진을 업로드해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setRefinementPrompt('');
    setLoadingMessage(LOADING_MESSAGES[0]);

    try {
      const getSizeInstructions = () => {
        switch (sizeOption) {
          case 'passport':
            return 'The final image aspect ratio must be exactly 3.5:4.5 (width:height).';
          case 'square':
            return 'The final image aspect ratio must be exactly 1:1.';
          case 'custom':
            const w = parseInt(customWidth, 10) || 35;
            const h = parseInt(customHeight, 10) || 45;
            return `The final image aspect ratio must be exactly ${w}:${h}.`;
          default:
            return 'The final image aspect ratio must be exactly 3.5:4.5 (width:height).';
        }
      };
      
      const instructions = getSizeInstructions();
      let finalPrompt = ID_PHOTO_PROMPT.replace('{size_instructions}', instructions);
      if (generationPrompt.trim()) {
        finalPrompt += `\n\n**Additional user request:** ${generationPrompt.trim()}`;
      }
      
      const base64Data = originalImage.split(',')[1];
      const newImageBase64 = await generateIdPhoto(base64Data, originalMimeType, finalPrompt);
      setGeneratedImage(`data:image/png;base64,${newImageBase64}`);
      setGenerationPrompt('');
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError('증명사진 생성에 실패했습니다. 다른 사진으로 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, originalMimeType, sizeOption, customWidth, customHeight, generationPrompt]);

  const handleRefine = useCallback(async () => {
    if (!generatedImage || !refinementPrompt.trim()) {
      setError('수정할 사진과 지시사항이 필요합니다.');
      return;
    }

    setIsRefining(true);
    setError(null);

    try {
      const base64Data = generatedImage.split(',')[1];
      const newImageBase64 = await generateIdPhoto(base64Data, 'image/png', refinementPrompt);
      setGeneratedImage(`data:image/png;base64,${newImageBase64}`);
      setRefinementPrompt('');
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError('사진 수정에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsRefining(false);
    }
  }, [generatedImage, refinementPrompt]);
  
  const getAspectRatioClass = () => {
    switch (sizeOption) {
      case 'passport':
        return 'aspect-[35/45]';
      case 'square':
        return 'aspect-square';
      case 'custom':
        const w = parseInt(customWidth, 10) || 35;
        const h = parseInt(customHeight, 10) || 45;
        return `aspect-[${w}/${h}]`;
      default:
        return 'aspect-[35/45]';
    }
  };

  const generatedPhotoAspectRatioClass = getAspectRatioClass();

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-8 p-6 bg-white rounded-2xl shadow-lg">
        <fieldset disabled={isLoading || isRefining}>
            <legend className="text-lg font-semibold text-slate-800 mb-4">사진 사이즈 선택</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <input type="radio" id="passport" name="sizeOption" value="passport" checked={sizeOption === 'passport'} onChange={() => setSizeOption('passport')} className="hidden peer" />
                    <label htmlFor="passport" className="block text-center p-4 rounded-lg border-2 border-slate-200 cursor-pointer peer-checked:border-indigo-600 peer-checked:text-indigo-600 peer-checked:font-semibold transition-all">
                        여권/주민등록증
                        <span className="block text-sm text-slate-500">3.5cm x 4.5cm</span>
                    </label>
                </div>
                <div>
                    <input type="radio" id="square" name="sizeOption" value="square" checked={sizeOption === 'square'} onChange={() => setSizeOption('square')} className="hidden peer" />
                    <label htmlFor="square" className="block text-center p-4 rounded-lg border-2 border-slate-200 cursor-pointer peer-checked:border-indigo-600 peer-checked:text-indigo-600 peer-checked:font-semibold transition-all">
                        정방형 프로필
                        <span className="block text-sm text-slate-500">1:1 비율</span>
                    </label>
                </div>
                <div>
                    <input type="radio" id="custom" name="sizeOption" value="custom" checked={sizeOption === 'custom'} onChange={() => setSizeOption('custom')} className="hidden peer" />
                    <label htmlFor="custom" className="block text-center p-4 rounded-lg border-2 border-slate-200 cursor-pointer peer-checked:border-indigo-600 peer-checked:text-indigo-600 peer-checked:font-semibold transition-all">
                        사용자 정의
                        <span className="block text-sm text-slate-500">비율 직접 입력</span>
                    </label>
                </div>
            </div>
            {sizeOption === 'custom' && (
                <div className="mt-4 flex items-center justify-center gap-4 p-4 bg-slate-50 rounded-lg">
                    <input type="number" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} className="w-24 p-2 border border-slate-300 rounded-md text-center" placeholder="가로" />
                    <span className="font-semibold"> : </span>
                    <input type="number" value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} className="w-24 p-2 border border-slate-300 rounded-md text-center" placeholder="세로" />
                    <span className="text-sm text-slate-600">(비율)</span>
                </div>
            )}
        </fieldset>
      </div>

      {originalImage && !generatedImage && !isLoading && (
        <div className="mb-8 p-6 bg-white rounded-2xl shadow-lg">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            특별 요청사항 (선택)
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            AI에게 사진 변환 시 특별히 강조하고 싶은 점을 알려주세요. (예: 안경은 그대로 유지해주세요)
          </p>
          <input 
            type="text"
            value={generationPrompt}
            onChange={(e) => setGenerationPrompt(e.target.value)}
            placeholder="AI에게 전달할 메시지를 입력하세요..."
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            disabled={isLoading}
          />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        <PhotoPanel title="원본 사진">
          {originalImage ? (
            <img src={originalImage} alt="Original upload" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-slate-500 p-4 flex flex-col items-center justify-center h-full">
              <UploadIcon className="w-12 h-12 mx-auto mb-2 text-slate-400" />
              <p>증명사진으로 변환할 사진을 업로드하세요.</p>
            </div>
          )}
        </PhotoPanel>

        <div className="flex-shrink-0 flex items-center justify-center py-4 lg:py-0">
          <button
            onClick={handleGenerate}
            disabled={!originalImage || isLoading || isRefining}
            className="w-full lg:w-auto bg-indigo-600 text-white font-bold py-3 px-6 rounded-full hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/50 transform hover:scale-105"
          >
            {isLoading ? (
              <>
                <SpinnerIcon className="w-5 h-5" />
                <span>변환 중...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                <span>AI 증명사진 생성</span>
              </>
            )}
          </button>
        </div>

        <PhotoPanel title="AI 생성 증명사진" aspectRatioClass={generatedPhotoAspectRatioClass}>
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 p-4 text-center">
              <SpinnerIcon className="w-12 h-12 mb-4" />
              <p className="font-semibold">{loadingMessage}</p>
            </div>
          )}
          {isRefining && (
             <div className="relative w-full h-full">
                {generatedImage && <img src={generatedImage} alt="Refining ID" className="w-full h-full object-cover filter blur-sm" />}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-75 text-slate-600 p-4 text-center">
                    <SpinnerIcon className="w-12 h-12 mb-4" />
                    <p className="font-semibold">AI가 사진을 수정하고 있습니다...</p>
                </div>
            </div>
          )}
          {error && !isLoading && !isRefining && (
            <div className="flex flex-col items-center justify-center h-full text-red-600 p-4 text-center">
              <p className="font-semibold">오류 발생</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          {generatedImage && !isLoading && !isRefining && (
             <img src={generatedImage} alt="Generated ID" className="w-full h-full object-cover" />
          )}
           {!generatedImage && !isLoading && !isRefining && !error && (
            <div className="text-center text-slate-500 p-4 flex flex-col items-center justify-center h-full">
              <p>AI가 생성한 증명사진이 여기에 표시됩니다.</p>
            </div>
          )}
        </PhotoPanel>
      </div>

      <div className="mt-8 flex justify-center items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/png, image/jpeg, image/webp"
            disabled={isLoading || isRefining}
          />
          <button
            onClick={triggerFileUpload}
            className="bg-white text-slate-700 font-semibold py-3 px-6 rounded-full border border-slate-300 hover:bg-slate-50 transition-colors duration-200 flex items-center gap-2 shadow-sm disabled:bg-slate-200 disabled:cursor-not-allowed"
            disabled={isLoading || isRefining}
          >
            <UploadIcon className="w-5 h-5" />
            <span>사진 업로드</span>
          </button>
          
          {generatedImage && !isLoading && !isRefining && (
            <a
              href={generatedImage}
              download="AI_ID_Photo.png"
              className="bg-green-500 text-white font-bold py-3 px-6 rounded-full hover:bg-green-600 transition-colors duration-200 flex items-center gap-2 shadow-lg hover:shadow-green-500/50"
            >
              <DownloadIcon className="w-5 h-5" />
              <span>사진 다운로드</span>
            </a>
          )}
      </div>

      {generatedImage && !isLoading && !isRefining && (
        <div className="mt-8 max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 text-center">AI에게 추가 수정 요청하기</h3>
          <div className="flex gap-3">
            <input 
              type="text"
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              placeholder="예: 머리를 조금 더 단정하게 해주세요."
              className="flex-grow p-3 border border-slate-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              disabled={isRefining}
            />
            <button
              onClick={handleRefine}
              disabled={isRefining || !refinementPrompt.trim()}
              className="bg-indigo-500 text-white font-bold py-3 px-6 rounded-full hover:bg-indigo-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <WandIcon className="w-5 h-5" />
              <span>수정하기</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoStudio;
