import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, FolderUp, File, Loader2 } from 'lucide-react';
import { uploadMultiplePdfs } from '@/services/api'; // 새로운 import 추가
import { useUploadProgress } from '@/contexts/UploadProgressContext';

interface FileUploadProps {
  onClose: () => void;
}

// Add type definitions for webkitdirectory and directory attributes
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    directory?: string;
    webkitdirectory?: string;
  }
}

const MAX_FILES = 15;
const ALLOWED_FILE_TYPE = 'application/pdf';

const FileUploader = ({ onClose }: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadType, setUploadType] = useState<'files' | 'folder'>('files');
  const { addTask } = useUploadProgress();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList);
    let addedFilesCount = 0;
    let skippedFilesCount = 0;

    const updatedFiles = [...files]; // 현재 파일 목록 복사

    for (const file of newFiles) {
      if (updatedFiles.length >= MAX_FILES) {
        toast.warning(`최대 ${MAX_FILES}개의 파일만 업로드할 수 있습니다. 나머지 파일은 건너뜁니다.`);
        skippedFilesCount += (newFiles.length - addedFilesCount); // 남은 파일 수만큼 스킵 처리
        break; // 파일 추가 중단
      }
      if (file.type === ALLOWED_FILE_TYPE) {
        updatedFiles.push(file);
        addedFilesCount++;
      } else {
        skippedFilesCount++;
      }
    }

    if (skippedFilesCount > 0) {
      toast.warning(`${skippedFilesCount}개의 파일이 건너뛰어졌습니다. PDF 파일만 업로드 가능하며, 최대 ${MAX_FILES}개까지 업로드할 수 있습니다.`);
    }
    
    setFiles(updatedFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("업로드할 PDF 파일을 하나 이상 선택해주세요.");
      return;
    }
    if (files.length > MAX_FILES) {
      toast.error(`최대 ${MAX_FILES}개의 PDF 파일만 업로드할 수 있습니다. 현재 ${files.length}개가 선택되었습니다.`);
      return;
    }

    // 모든 파일이 PDF인지 다시 한번 확인 (선택 후 파일 타입이 변경될 가능성은 거의 없지만 안전장치)
    const nonPdfFiles = files.filter(file => file.type !== ALLOWED_FILE_TYPE);
    if (nonPdfFiles.length > 0) {
      toast.error('PDF 파일만 업로드할 수 있습니다. 선택된 파일 목록을 확인해주세요.');
      return;
    }

    setUploading(true);
    setProgress(0); // 프로그레스 초기화
    
    try {
      // 실제 API 호출 로직으로 변경
      const response = await uploadMultiplePdfs(files);
      
      // 각 파일에 대해 진행 상황 추적 작업 추가
      files.forEach(file => {
        addTask(response.run_id, file.name);
      });
      
      toast.success(response.message || `${files.length}개 PDF 파일 업로드 요청 성공`);
      toast.info('파일 처리 진행 상황을 확인하세요!');
      setFiles([]); // 성공 시 파일 목록 초기화
      onClose(); // 업로드 성공 시 다이얼로그 닫기
    } catch (error) {
      console.error('File upload error:', error);
      if (error instanceof Error) {
        toast.error(error.message || '파일 업로드 중 오류가 발생했습니다.');
      } else {
        toast.error('알 수 없는 오류로 파일 업로드에 실패했습니다.');
      }
    } finally {
      setUploading(false);
      setProgress(0); // 실패 또는 성공 시 프로그레스 초기화
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    if (uploadType === 'files' && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (uploadType === 'folder' && folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <RadioGroup 
        defaultValue="files" 
        className="flex gap-4"
        onValueChange={(value) => setUploadType(value as 'files' | 'folder')}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="files" id="files" />
          <Label htmlFor="files" className="flex items-center gap-1">
            <File className="h-4 w-4" />
            파일
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="folder" id="folder" />
          <Label htmlFor="folder" className="flex items-center gap-1">
            <FolderUp className="h-4 w-4" />
            폴더
          </Label>
        </div>
      </RadioGroup>

      <div
        className={`
          border-2 border-dashed rounded-lg p-6
          ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'}
          ${files.length > 0 ? 'bg-muted/50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-4">
          <div className="p-3 bg-secondary rounded-full">
            {uploadType === 'files' ? (
              <Upload className="h-6 w-6 text-primary" />
            ) : (
              <FolderUp className="h-6 w-6 text-primary" />
            )}
          </div>
          
          <div className="text-center">
            <p className="text-sm font-medium">
              {uploadType === 'files' 
                ? '여기에 파일을 끌어다 놓거나 클릭하여 파일을 선택하세요'
                : '여기에 폴더를 끌어다 놓거나 클릭하여 폴더를 선택하세요'
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF 파일 형식만 지원 (최대 {MAX_FILES}개)
            </p>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            onClick={triggerFileInput}
            disabled={uploading}
          >
            {uploadType === 'files' ? '파일 선택' : '폴더 선택'}
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-2">
          <p className="text-sm font-medium mb-2">선택된 파일 ({files.length}개)</p>
          <div className="max-h-[200px] overflow-y-auto border rounded-md">
            {files.map((file, index) => (
              <div 
                key={`${file.name}-${index}`}
                className="flex items-center justify-between py-2 px-3 border-b last:border-0"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <File className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm truncate">{file.name}</p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                  className="h-6 w-6 p-0"
                >
                  &times;
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-center text-muted-foreground">
            {files.length}개 파일 업로드 중... ({progress}%)
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          disabled={uploading}
        >
          취소
        </Button>
        <Button 
          type="button"
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              업로드 중...
            </>
          ) : (
            '업로드'
          )}
        </Button>
      </div>
    </div>
  );
};

export default FileUploader;
