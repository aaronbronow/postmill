<svelte:head>
  <script src="https://cdn.tailwindcss.com"></script>
</svelte:head>

<!-- v1.5.0 -->
<script lang="ts">
  import { backend } from './wmill';
  import { onMount } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';

  let activeTab = $state('Upload');
  let name = $state('Postmill');

  // Upload Tab State
  let filesToUpload = $state<FileList | null>(null);
  let uploadStatus = $state('');
  let isUploading = $state(false);
  let isDragging = $state(false);

  // Draft Tab State
  let drafts = $state<any[]>([]);
  let selectedDraft = $state<any>(null);
  let isLoadingDrafts = $state(false);
  let isDeleting = $state(false);
  let isSavingDraft = $state(false);
  let saveStatus = $state('');

  // Post Tab State
  let selectedAccounts = $state<string[]>([]);
  const availableAccounts = ['Instagram', 'Threads', 'Facebook'];
  let isPosting = $state(false);
  let postStatus = $state('');

  const flipDurationMs = 300;

  onMount(async () => {
    await loadDrafts();
  });

  async function loadDrafts() {
    isLoadingDrafts = true;
    try {
      const result = await backend.load_drafts({ filename: 'postmill.json' });
      // Add stable IDs to images for dndzone
      drafts = (result || []).map((d: any) => ({
        ...d,
        images: (d.images || []).map((img: any, idx: number) => ({
          ...img,
          id: img.id || `${d.id}-img-${idx}-${Math.random().toString(36).substr(2, 9)}`
        }))
      }));
      
      if (selectedDraft) {
        const updatedSelected = drafts.find(d => d.id === selectedDraft.id);
        if (updatedSelected) {
          selectedDraft = updatedSelected;
        }
      }
    } catch (e) {
      console.error('Error loading drafts:', e);
    } finally {
      isLoadingDrafts = false;
    }
  }

  async function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      filesToUpload = input.files;
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files) {
      filesToUpload = e.dataTransfer.files;
    }
  }

  async function validateImage(file: File): Promise<{valid: boolean, error?: string}> {
    // 1. Format check
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return { valid: false, error: `${file.name}: Unsupported format. Only JPEG and PNG are supported.` };
    }

    // 2. Size check (Max 8 MB)
    if (file.size > 8 * 1024 * 1024) {
      return { valid: false, error: `${file.name}: File is too large. Max size is 8MB (currently ${(file.size / (1024 * 1024)).toFixed(1)}MB).` };
    }

    // 3. Aspect Ratio check
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const ratio = img.width / img.height;
        // Instagram: 1.91:1 (1.91) to 4:5 (0.8)
        if (ratio < 0.8 || ratio > 1.91) {
          resolve({ 
            valid: true, 
            error: `${file.name}: Aspect ratio (${ratio.toFixed(2)}) is outside recommended range (0.8 to 1.91). This may fail on Instagram.` 
          });
        } else {
          resolve({ valid: true });
        }
      };
      img.onerror = () => {
        resolve({ valid: false, error: `${file.name}: Failed to load image for validation.` });
      };
    });
  }

  async function createDraft() {
    if (!filesToUpload || filesToUpload.length === 0) return;

    isUploading = true;
    uploadStatus = 'Starting upload process...';
    try {
      const imageUrls = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        
        // Validation
        const validation = await validateImage(file);
        if (validation.error) {
          if (!validation.valid) {
             throw new Error(validation.error);
          } else {
             if (!confirm(validation.error + "\nContinue anyway?")) {
               throw new Error("Upload cancelled by user due to validation warning.");
             }
          }
        }

        uploadStatus = `Uploading ${i + 1}/${filesToUpload.length}: ${file.name}... (Phase 1: Getting presigned URL)`;
        const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { uploadUrl, publicUrl } = await backend.get_upload_url({
          name: uniqueName,
          contentType: file.type
        });

        uploadStatus = `Uploading ${i + 1}/${filesToUpload.length}: ${file.name}... (Phase 2: Sending data to S3)`;
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        });

        if (!response.ok) {
           throw new Error(`S3 Upload failed with status ${response.status}: ${await response.text()}`);
        }
        
        imageUrls.push(publicUrl);
      }

      uploadStatus = 'Finalizing draft...';
      const result = await backend.save_drafts({
        filename: 'postmill.json',
        imageUrls: imageUrls
      });
      
      uploadStatus = 'Draft created successfully!';
      filesToUpload = null;
      await loadDrafts();
      
      activeTab = 'Draft';
      if (drafts.length > 0) {
        selectedDraft = drafts[drafts.length - 1];
      }
    } catch (e: any) {
      console.error('Error creating draft:', e);
      uploadStatus = 'Error: ' + (e.message || e);
      if (e.message?.includes('CORS')) {
         uploadStatus += "\nHint: Ensure your S3 bucket's CORS allows PUT from this domain.";
      }
    } finally {
      isUploading = false;
    }
  }

  async function saveDraftUpdates() {
    if (!selectedDraft) return;

    isSavingDraft = true;
    saveStatus = 'Saving...';
    try {
      const imagesToSave = selectedDraft.images.map(({ id, ...img }: any) => img);
      
      await backend.save_drafts({
        filename: 'postmill.json',
        draftId: selectedDraft.id,
        description: selectedDraft.description,
        reorderedImages: imagesToSave
      });
      saveStatus = 'Saved';
      setTimeout(() => { if (saveStatus === 'Saved') saveStatus = ''; }, 2000);
    } catch (e: any) {
      console.error('Error saving draft:', e);
      saveStatus = 'Error saving';
    } finally {
      isSavingDraft = false;
    }
  }

  let saveTimeout: any;
  function handleDescriptionChange() {
    clearTimeout(saveTimeout);
    saveStatus = 'Typing...';
    saveTimeout = setTimeout(() => {
      saveDraftUpdates();
    }, 1000);
  }

  function handleDndConsider(e: CustomEvent) {
    selectedDraft.images = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent) {
    selectedDraft.images = e.detail.items;
    saveDraftUpdates();
  }

  async function deleteDraft() {
    if (!selectedDraft) return;
    if (!confirm('Are you sure you want to delete this draft and all its images?')) return;

    isDeleting = true;
    try {
      const result = await backend.delete_draft({
        filename: 'postmill.json',
        draftId: selectedDraft.id
      });
      
      if (result.status === 'Draft deleted') {
        selectedDraft = null;
        await loadDrafts();
      } else {
        alert('Error deleting draft: ' + result.message);
      }
    } catch (e: any) {
      console.error('Error deleting draft:', e);
      alert('Error: ' + e.message);
    } finally {
      isDeleting = false;
    }
  }

  async function postToAccounts() {
    if (!selectedDraft || selectedAccounts.length === 0) return;

    isPosting = true;
    postStatus = 'Initiating posts...';
    
    try {
      for (const account of selectedAccounts) {
        postStatus = `Posting to ${account}...`;
        if (account === 'Threads') {
          const result = await backend.post_to_threads({
            filename: 'postmill.json',
            draftId: selectedDraft.id
          });
          if (result.status === 'Success') {
            postStatus = `Successfully posted to Threads! ID: ${result.thread_id}`;
          } else {
            postStatus = `Error posting to Threads: ${result.message}`;
            break;
          }
        } else {
          postStatus = `${account} integration not implemented yet. Skipping.`;
        }
      }
    } catch (e: any) {
      console.error('Error during posting:', e);
      postStatus = 'Error: ' + (e.message || e);
    } finally {
      isPosting = false;
    }
  }

  function selectDraft(draft: any) {
    selectedDraft = draft;
    saveStatus = '';
  }

  function toggleAccount(account: string) {
    if (selectedAccounts.includes(account)) {
      selectedAccounts = selectedAccounts.filter(a => a !== account);
    } else {
      selectedAccounts = [...selectedAccounts, account];
    }
  }
</script>

<main class="container">
  <header class="topbar">
    <div class="flex items-center gap-4">
      <h1 class="text-xl font-bold">{name}</h1>
      {#if saveStatus}
        <span class="text-xs text-gray-400 italic">{saveStatus}</span>
      {/if}
    </div>
    <button class="btn btn-secondary btn-sm" on:click={loadDrafts} disabled={isLoadingDrafts}>
      {isLoadingDrafts ? 'Refreshing...' : 'Refresh'}
    </button>
  </header>

  <nav class="tabs">
    <button 
      class="tab-link {activeTab === 'Upload' ? 'active' : ''}" 
      on:click={() => activeTab = 'Upload'}
    >
      Upload
    </button>
    <button 
      class="tab-link {activeTab === 'Draft' ? 'active' : ''}" 
      on:click={() => activeTab = 'Draft'}
    >
      Draft
    </button>
    <button 
      class="tab-link {activeTab === 'Post' ? 'active' : ''}" 
      on:click={() => activeTab = 'Post'}
    >
      Post
    </button>
  </nav>

  <section class="content">
    {#if activeTab === 'Upload'}
      <div class="upload-area">
        <div 
          class="card p-8 border-dashed border-2 text-center transition-colors {isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}"
          on:dragover={handleDragOver}
          on:dragleave={handleDragLeave}
          on:drop={handleDrop}
        >
          <input type="file" multiple on:change={handleFileUpload} id="file-input" class="hidden" />
          <label for="file-input" class="cursor-pointer block w-full h-full">
            <div class="py-4">
              {#if filesToUpload && filesToUpload.length > 0}
                <p class="font-bold">{filesToUpload.length} files selected</p>
                <div class="flex flex-wrap gap-2 justify-center mt-4">
                   {#each Array.from(filesToUpload) as file}
                     <span class="bg-gray-100 px-2 py-1 rounded text-xs">{file.name}</span>
                   {/each}
                </div>
              {:else}
                <p class="text-gray-500">Drag and drop files or click to select them</p>
              {/if}
            </div>
          </label>
        </div>
        
        <div class="mt-4 flex justify-center">
          <button 
            class="btn btn-primary" 
            on:click={createDraft} 
            disabled={!filesToUpload || isUploading}
          >
            {isUploading ? 'Processing...' : 'Create Draft'}
          </button>
        </div>
        
        {#if uploadStatus}
          <div class="status-msg p-4 text-sm bg-gray-50 rounded mt-4 border {uploadStatus.startsWith('Error') ? 'text-red-600 border-red-100' : 'text-gray-600 border-gray-100'}">
             <pre class="whitespace-pre-wrap font-sans">{uploadStatus}</pre>
          </div>
        {/if}
      </div>

    {:else}
      {#if activeTab === 'Draft'}
        <div class="draft-container">
          <div class="draft-sidebar">
            <h3 class="font-semibold mb-2">Drafts</h3>
            {#if isLoadingDrafts}
              <p class="text-sm text-gray-400">Loading...</p>
            {:else if drafts.length === 0}
              <p class="text-sm text-gray-400">No drafts found.</p>
            {:else}
              <ul class="draft-list">
                {#each drafts as draft}
                  <li 
                    class="draft-item {selectedDraft?.id === draft.id ? 'selected' : ''}"
                    on:click={() => selectDraft(draft)}
                  >
                    <div class="text-sm">Draft {new Date(draft.id).toLocaleDateString()}</div>
                    <div class="text-xs text-gray-400">{new Date(draft.id).toLocaleTimeString()}</div>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>

          <div class="draft-main">
            {#if selectedDraft}
              <div class="flex justify-between items-center mb-6">
                <h3 class="m-0 font-bold">Draft Details</h3>
                <button 
                  class="btn btn-danger btn-sm" 
                  on:click={deleteDraft}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Draft'}
                </button>
              </div>

              <div 
                class="image-grid"
                use:dndzone={{items: selectedDraft.images, flipDurationMs}}
                on:consider={handleDndConsider}
                on:finalize={handleDndFinalize}
              >
                {#each selectedDraft.images as img (img.id)}
                  <div class="image-card relative group" animate:flip={{duration: flipDurationMs}}>
                    <img src={img.url} alt="Draft image" />
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity pointer-events-none"></div>
                  </div>
                {/each}
              </div>

              <div class="mt-8">
                <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  id="description" 
                  bind:value={selectedDraft.description} 
                  on:input={handleDescriptionChange}
                  placeholder="Enter description here..."
                  rows="6"
                  class="form-control"
                ></textarea>
              </div>
            {:else}
              <div class="h-full flex flex-col items-center justify-center text-gray-400">
                <p>Select a draft to view details</p>
              </div>
            {/if}
          </div>
        </div>

      {:else if activeTab === 'Post'}
        <div class="post-container max-w-lg mx-auto py-8">
          <h3 class="font-bold text-lg">Target Accounts</h3>
          <div class="accounts-list mt-6">
            {#each availableAccounts as account}
              <label class="account-option">
                <input 
                  type="checkbox" 
                  checked={selectedAccounts.includes(account)} 
                  on:change={() => toggleAccount(account)}
                />
                <span class="ml-3 font-medium">{account}</span>
              </label>
            {/each}
          </div>
          
          <div class="mt-10">
            <button 
              class="btn btn-primary w-full py-3" 
              disabled={selectedAccounts.length === 0 || !selectedDraft || isPosting}
              on:click={postToAccounts}
            >
              {isPosting ? 'Posting...' : 'Post to Selected Accounts'}
            </button>
            
            {#if postStatus}
              <p class="mt-6 p-4 rounded bg-blue-50 text-sm font-medium text-blue-700 border border-blue-100">{postStatus}</p>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </section>
</main>

<style>
  :global(.btn-danger) {
    background-color: #ef4444;
    color: white;
  }
  :global(.btn-danger:hover) {
    background-color: #dc2626;
  }
  :global(.btn-danger:disabled) {
    background-color: #fca5a5;
    cursor: not-allowed;
  }
  .m-0 { margin: 0; }
  .mb-4 { margin-bottom: 1rem; }
  
  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
    min-height: 140px;
  }

  .image-card {
    aspect-ratio: 1;
    border-radius: 0.5rem;
    overflow: hidden;
    background: #f3f4f6;
    border: 2px solid transparent;
    transition: transform 0.2s, border-color 0.2s;
    cursor: grab;
  }

  .image-card:active {
    cursor: grabbing;
  }

  .image-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
