<script lang="ts">
  import { backend } from './wmill';
  import { onMount } from 'svelte';

  let activeTab = $state('Upload');
  let name = $state('Post Photo App');

  // Upload Tab State
  let filesToUpload = $state<FileList | null>(null);
  let uploadStatus = $state('');
  let isUploading = $state(false);

  // Draft Tab State
  let drafts = $state<any[]>([]);
  let selectedDraft = $state<any>(null);
  let description = $state('');
  let isLoadingDrafts = $state(false);

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

  async function createDraft() {
    if (!filesToUpload || filesToUpload.length === 0) return;

    isUploading = true;
    uploadStatus = 'Uploading and creating draft...';
    try {
      // In a real Svelte full-code app on Windmill, we would need to upload the files to S3.
      // For now, we'll simulate it by sending the names, as the backend save_drafts expects strings.
      const filenames = Array.from(filesToUpload).map(f => f.name);
      
      const result = await backend.save_drafts({
        filename: 'postmill.json',
        images: filenames
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
    } catch (e) {
      console.error('Error creating draft:', e);
      uploadStatus = 'Error: ' + e.message;
    } finally {
      isUploading = false;
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
    <button class="btn btn-secondary btn-sm" onclick={loadDrafts} disabled={isLoadingDrafts}>
      {isLoadingDrafts ? 'Refreshing...' : 'Refresh'}
    </button>
  </header>

  <nav class="tabs">
    <button 
      class="tab-link {activeTab === 'Upload' ? 'active' : ''}" 
      onclick={() => activeTab = 'Upload'}
    >
      Upload
    </button>
    <button 
      class="tab-link {activeTab === 'Draft' ? 'active' : ''}" 
      onclick={() => activeTab = 'Draft'}
    >
      Draft
    </button>
    <button 
      class="tab-link {activeTab === 'Post' ? 'active' : ''}" 
      onclick={() => activeTab = 'Post'}
    >
      Post
    </button>
  </nav>

  <section class="content">
    {#if activeTab === 'Upload'}
      <div class="upload-area">
        <div class="card p-8 border-dashed border-2 text-center">
          <input type="file" multiple onchange={handleFileUpload} id="file-input" class="hidden" />
          <label for="file-input" class="cursor-pointer">
            <div class="py-4">
              {#if filesToUpload && filesToUpload.length > 0}
                <p class="font-bold">{filesToUpload.length} files selected</p>
                <ul class="text-sm mt-2">
                  {#each Array.from(filesToUpload) as file}
                    <li>{file.name}</li>
                  {/each}
                </ul>
              {:else}
                <p>Drag and drop files or click to select them</p>
              {/if}
            </div>
          </label>
        </div>
        
        <div class="mt-4 flex justify-center">
          <button 
            class="btn btn-primary" 
            onclick={createDraft} 
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
                    onclick={() => selectDraft(draft)}
                  >
                    Draft {new Date(draft.id).toLocaleString()}
                  </li>
                {/each}
              </ul>
            {/if}
          </div>

          <div class="draft-main">
            {#if selectedDraft}
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
                  onchange={() => toggleAccount(account)}
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
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #f9fafb;
    color: #111827;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    border-bottom: 1px solid #e5e7eb;
  }

  .topbar h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .tabs {
    display: flex;
    background: white;
    padding: 0 2rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .tab-link {
    padding: 1rem 1.5rem;
    border: none;
    background: none;
    cursor: pointer;
    font-weight: 500;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }

  .tab-link:hover {
    color: #111827;
  }

  .tab-link.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
  }

  .content {
    padding: 2rem;
  }

  .card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  }

  .p-8 { padding: 2rem; }
  .border-dashed { border-style: dashed; }
  .border-2 { border-width: 2px; }
  .text-center { text-align: center; }
  .hidden { display: none; }
  .cursor-pointer { cursor: pointer; }
  .mt-4 { margin-top: 1rem; }
  .mt-8 { margin-top: 2rem; }
  .flex { display: flex; }
  .justify-center { justify-content: center; }
  .w-full { width: 100%; }
  .font-bold { font-weight: 700; }
  .text-sm { font-size: 0.875rem; }
  .ml-2 { margin-left: 0.5rem; }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background-color 0.2s;
  }

  .btn-primary {
    background-color: #2563eb;
    color: white;
  }

  .btn-primary:hover {
    background-color: #1d4ed8;
  }

  .btn-primary:disabled {
    background-color: #93c5fd;
    cursor: not-allowed;
  }

  .btn-secondary {
    background-color: white;
    border-color: #d1d5db;
    color: #374151;
  }

  .btn-secondary:hover {
    background-color: #f3f4f6;
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }

  .status-msg {
    text-align: center;
    margin-top: 1rem;
    color: #4b5563;
  }

  .draft-container {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 2rem;
    height: calc(100vh - 250px);
  }

  .draft-sidebar {
    background: white;
    border-radius: 0.5rem;
    padding: 1rem;
    overflow-y: auto;
    border: 1px solid #e5e7eb;
  }

  .draft-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .draft-item {
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    margin-bottom: 0.5rem;
    transition: background-color 0.2s;
  }

  .draft-item:hover {
    background-color: #f3f4f6;
  }

  .draft-item.selected {
    background-color: #eff6ff;
    color: #1d4ed8;
    font-weight: 600;
  }

  .draft-main {
    background: white;
    border-radius: 0.5rem;
    padding: 2rem;
    border: 1px solid #e5e7eb;
    overflow-y: auto;
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }

  .image-card {
    aspect-ratio: 1;
    border-radius: 0.375rem;
    overflow: hidden;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
  }

  .image-card img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .form-control {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    margin-top: 0.5rem;
    font-family: inherit;
  }

  .account-option {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
    background: white;
    cursor: pointer;
  }

  .account-option:hover {
    background-color: #f9fafb;
  }
</style>
