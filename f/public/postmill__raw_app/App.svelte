<svelte:head>
  <script src="https://cdn.tailwindcss.com"></script>
</svelte:head>

<!-- v1.0.5 -->
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
        <div class="card p-8 border-dashed border-2 text-center">
          <input type="file" multiple on:change={handleFileUpload} id="file-input" class="hidden" />
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