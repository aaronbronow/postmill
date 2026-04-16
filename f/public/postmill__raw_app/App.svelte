<svelte:head>
  <script src="https://cdn.tailwindcss.com"></script>
</svelte:head>

<!-- v1.1.0 -->
<script lang="ts">
  import { backend } from './wmill';
  import { onMount } from 'svelte';
  import * as wmill from 'windmill-client';

  let activeTab = $state('Upload');
  let name = $state('Post Photo App');

  // Upload Tab State
  let filesToUpload = $state<FileList | null>(null);
  let uploadStatus = $state('');
  let isUploading = $state(false);
  let isDragging = $state(false);

  // Draft Tab State
  let drafts = $state<any[]>([]);
  let selectedDraft = $state<any>(null);
  let description = $state('');
  let isLoadingDrafts = $state(false);
  let isDeleting = $state(false);

  // Post Tab State
  let selectedAccounts = $state<string[]>([]);
  const availableAccounts = ['Instagram', 'Threads', 'Facebook'];

  onMount(async () => {
    await loadDrafts();
  });

  async function loadDrafts() {
    isLoadingDrafts = true;
    try {
      const result = await backend.load_drafts({ filename: 'postmill.json' });
      drafts = result || [];
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

  // Utility to convert File to base64
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the "data:image/jpeg;base64," prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  async function createDraft() {
    if (!filesToUpload || filesToUpload.length === 0) return;

    isUploading = true;
    uploadStatus = 'Preparing images...';
    try {
      const imageData = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        uploadStatus = `Reading file ${i + 1}/${filesToUpload.length}: ${file.name}...`;
        
        const base64Content = await fileToBase64(file);
        
        imageData.push({
          name: file.name,
          content: base64Content
        });
      }

      uploadStatus = 'Sending to backend for S3 upload and manifest update...';
      const result = await backend.save_drafts({
        filename: 'postmill.json',
        images: imageData
      });
      
      console.log('Draft created:', result);
      uploadStatus = 'Draft created successfully!';
      
      // Clear files and refresh drafts
      filesToUpload = null;
      await loadDrafts();
      
      // Switch to Draft tab
      activeTab = 'Draft';
      if (drafts.length > 0) {
        selectedDraft = drafts[drafts.length - 1];
      }
    } catch (e: any) {
      console.error('Error creating draft:', e);
      uploadStatus = 'Error: ' + (e.message || e);
    } finally {
      isUploading = false;
    }
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

  function selectDraft(draft: any) {
    selectedDraft = draft;
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
    <h1>{name}</h1>
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
                <ul class="text-sm mt-2 list-none p-0">
                  {#each Array.from(filesToUpload) as file}
                    <li>{file.name}</li>
                  {/each}
                </ul>
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
          <p class="status-msg">{uploadStatus}</p>
        {/if}
      </div>

    {:else}
      {#if activeTab === 'Draft'}
        <div class="draft-container">
          <div class="draft-sidebar">
            <h3>Drafts</h3>
            {#if isLoadingDrafts}
              <p>Loading...</p>
            {:else if drafts.length === 0}
              <p>No drafts found.</p>
            {:else}
              <ul class="draft-list">
                {#each drafts as draft}
                  <li 
                    class="draft-item {selectedDraft?.id === draft.id ? 'selected' : ''}"
                    on:click={() => selectDraft(draft)}
                  >
                    Draft {new Date(draft.id).toLocaleString()}
                  </li>
                {/each}
              </ul>
            {/if}
          </div>

          <div class="draft-main">
            {#if selectedDraft}
              <div class="flex justify-between items-center mb-4">
                <h3 class="m-0">Draft Details</h3>
                <button 
                  class="btn btn-danger btn-sm" 
                  on:click={deleteDraft}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Draft'}
                </button>
              </div>

              <div class="image-grid">
                {#each selectedDraft.images as img}
                  <div class="image-card">
                    <img src={img.url} alt="Draft image" />
                  </div>
                {/each}
              </div>
              <div class="mt-4">
                <label for="description">Description</label>
                <textarea 
                  id="description" 
                  bind:value={description} 
                  placeholder="Enter description here..."
                  rows="4"
                  class="form-control"
                ></textarea>
              </div>
            {:else}
              <p class="text-center mt-10 text-gray-500">Select a draft to view details</p>
            {/if}
          </div>
        </div>

      {:else if activeTab === 'Post'}
        <div class="post-container max-w-lg mx-auto">
          <h3>Target Accounts</h3>
          <div class="accounts-list mt-4">
            {#each availableAccounts as account}
              <label class="account-option">
                <input 
                  type="checkbox" 
                  checked={selectedAccounts.includes(account)} 
                  on:change={() => toggleAccount(account)}
                />
                <span class="ml-2">{account}</span>
              </label>
            {/each}
          </div>
          
          <div class="mt-8">
            <button class="btn btn-primary w-full" disabled={selectedAccounts.length === 0 || !selectedDraft}>
              Post to Selected Accounts
            </button>
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
</style>
