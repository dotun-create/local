/**
 * State Preservation Service
 * 
 * This service saves and restores UI state during page refreshes,
 * preserving user context like form data, scroll position, and UI settings.
 */

class StatePreserver {
  constructor() {
    this.stateKey = 'preserved_ui_state';
    this.formDataKey = 'preserved_form_data';
    this.scrollKey = 'preserved_scroll_position';
    this.uiSettingsKey = 'preserved_ui_settings';
    this.expirationTime = 60000; // 1 minute
  }

  /**
   * Save current page state
   */
  async saveCurrentState() {
    try {
      const state = {
        timestamp: Date.now(),
        url: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        scrollPosition: this._getScrollPosition(),
        formData: this._getFormData(),
        uiSettings: this._getUISettings(),
        expandedSections: this._getExpandedSections(),
        selectedTabs: this._getSelectedTabs(),
        filters: this._getActiveFilters()
      };

      // Save to sessionStorage
      sessionStorage.setItem(this.stateKey, JSON.stringify(state));
      
      console.log('State preserved:', state);
      return true;
      
    } catch (error) {
      console.error('Failed to save state:', error);
      return false;
    }
  }

  /**
   * Restore previously saved state
   */
  async restoreState() {
    try {
      const savedStateStr = sessionStorage.getItem(this.stateKey);
      if (!savedStateStr) {
        return false;
      }

      const savedState = JSON.parse(savedStateStr);
      
      // Check if state is expired
      if (Date.now() - savedState.timestamp > this.expirationTime) {
        this.clearSavedState();
        return false;
      }

      // Check if we're on the same page
      if (savedState.pathname !== window.location.pathname) {
        return false;
      }

      // Restore various state components
      this._restoreScrollPosition(savedState.scrollPosition);
      this._restoreFormData(savedState.formData);
      this._restoreUISettings(savedState.uiSettings);
      this._restoreExpandedSections(savedState.expandedSections);
      this._restoreSelectedTabs(savedState.selectedTabs);
      this._restoreFilters(savedState.filters);
      
      console.log('State restored:', savedState);
      
      // Clear saved state after restoration
      this.clearSavedState();
      return true;
      
    } catch (error) {
      console.error('Failed to restore state:', error);
      return false;
    }
  }

  /**
   * Get current scroll position
   */
  _getScrollPosition() {
    return {
      x: window.scrollX || window.pageXOffset,
      y: window.scrollY || window.pageYOffset
    };
  }

  /**
   * Restore scroll position
   */
  _restoreScrollPosition(position) {
    if (position && typeof position.y === 'number') {
      // Delay to ensure content is loaded
      setTimeout(() => {
        window.scrollTo(position.x || 0, position.y || 0);
      }, 100);
    }
  }

  /**
   * Get form data from all forms on the page
   */
  _getFormData() {
    const forms = document.querySelectorAll('form');
    const formData = {};

    forms.forEach((form, index) => {
      const formId = form.id || `form_${index}`;
      const data = {};

      // Get all input elements
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        const name = input.name || input.id;
        if (!name) return;

        if (input.type === 'checkbox') {
          data[name] = input.checked;
        } else if (input.type === 'radio') {
          if (input.checked) {
            data[name] = input.value;
          }
        } else if (input.type !== 'password' && input.type !== 'file') {
          // Don't save sensitive data
          data[name] = input.value;
        }
      });

      if (Object.keys(data).length > 0) {
        formData[formId] = data;
      }
    });

    return formData;
  }

  /**
   * Restore form data
   */
  _restoreFormData(formData) {
    if (!formData || typeof formData !== 'object') return;

    Object.keys(formData).forEach(formId => {
      const form = document.getElementById(formId) || document.querySelector(`form:nth-of-type(${parseInt(formId.split('_')[1]) + 1})`);
      if (!form) return;

      const data = formData[formId];
      Object.keys(data).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"], [id="${fieldName}"]`);
        if (!field) return;

        if (field.type === 'checkbox') {
          field.checked = data[fieldName];
        } else if (field.type === 'radio') {
          const radio = form.querySelector(`[name="${fieldName}"][value="${data[fieldName]}"]`);
          if (radio) radio.checked = true;
        } else {
          field.value = data[fieldName];
        }

        // Trigger change event
        const event = new Event('change', { bubbles: true });
        field.dispatchEvent(event);
      });
    });
  }

  /**
   * Get UI settings (theme, sidebar state, etc.)
   */
  _getUISettings() {
    return {
      theme: document.body.getAttribute('data-theme'),
      sidebarCollapsed: document.querySelector('.sidebar')?.classList.contains('collapsed'),
      modalOpen: document.querySelector('.modal.show') !== null,
      dropdownsOpen: this._getOpenDropdowns()
    };
  }

  /**
   * Restore UI settings
   */
  _restoreUISettings(settings) {
    if (!settings) return;

    // Restore theme
    if (settings.theme) {
      document.body.setAttribute('data-theme', settings.theme);
    }

    // Restore sidebar state
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && settings.sidebarCollapsed !== undefined) {
      sidebar.classList.toggle('collapsed', settings.sidebarCollapsed);
    }

    // Note: We don't restore modals or dropdowns as they might have different context
  }

  /**
   * Get expanded sections (accordions, collapsibles)
   */
  _getExpandedSections() {
    const expanded = [];
    
    // Check for Bootstrap accordions
    document.querySelectorAll('.accordion-collapse.show').forEach(element => {
      expanded.push(element.id);
    });

    // Check for custom collapsibles
    document.querySelectorAll('[data-expanded="true"]').forEach(element => {
      expanded.push(element.id || element.getAttribute('data-section-id'));
    });

    return expanded;
  }

  /**
   * Restore expanded sections
   */
  _restoreExpandedSections(sections) {
    if (!sections || !Array.isArray(sections)) return;

    sections.forEach(sectionId => {
      if (!sectionId) return;

      const element = document.getElementById(sectionId);
      if (element) {
        // Bootstrap accordion
        if (element.classList.contains('accordion-collapse')) {
          element.classList.add('show');
        }
        // Custom collapsible
        element.setAttribute('data-expanded', 'true');
      }
    });
  }

  /**
   * Get selected tabs
   */
  _getSelectedTabs() {
    const tabs = {};

    // Bootstrap tabs
    document.querySelectorAll('.nav-tabs').forEach((tabList, index) => {
      const activeTab = tabList.querySelector('.nav-link.active');
      if (activeTab) {
        const tabId = tabList.id || `tabs_${index}`;
        tabs[tabId] = activeTab.getAttribute('data-bs-target') || activeTab.getAttribute('href');
      }
    });

    // Custom tabs
    document.querySelectorAll('[role="tablist"]').forEach((tabList, index) => {
      const activeTab = tabList.querySelector('[aria-selected="true"]');
      if (activeTab) {
        const tabId = tabList.id || `custom_tabs_${index}`;
        tabs[tabId] = activeTab.id;
      }
    });

    return tabs;
  }

  /**
   * Restore selected tabs
   */
  _restoreSelectedTabs(tabs) {
    if (!tabs || typeof tabs !== 'object') return;

    Object.keys(tabs).forEach(tabListId => {
      const tabList = document.getElementById(tabListId);
      if (!tabList) return;

      const targetTab = tabs[tabListId];
      if (!targetTab) return;

      // Find and click the tab
      const tabLink = tabList.querySelector(`[data-bs-target="${targetTab}"], [href="${targetTab}"], #${targetTab}`);
      if (tabLink) {
        tabLink.click();
      }
    });
  }

  /**
   * Get active filters
   */
  _getActiveFilters() {
    const filters = {};

    // Get all filter inputs
    document.querySelectorAll('[data-filter], .filter-input').forEach(filter => {
      const name = filter.name || filter.id || filter.getAttribute('data-filter-name');
      if (!name) return;

      if (filter.type === 'checkbox' && filter.checked) {
        filters[name] = true;
      } else if (filter.type === 'select-one' && filter.value) {
        filters[name] = filter.value;
      } else if (filter.type === 'text' && filter.value) {
        filters[name] = filter.value;
      }
    });

    return filters;
  }

  /**
   * Restore filters
   */
  _restoreFilters(filters) {
    if (!filters || typeof filters !== 'object') return;

    Object.keys(filters).forEach(filterName => {
      const filter = document.querySelector(`[name="${filterName}"], [id="${filterName}"], [data-filter-name="${filterName}"]`);
      if (!filter) return;

      if (filter.type === 'checkbox') {
        filter.checked = filters[filterName];
      } else {
        filter.value = filters[filterName];
      }

      // Trigger change event
      const event = new Event('change', { bubbles: true });
      filter.dispatchEvent(event);
    });
  }

  /**
   * Get open dropdowns
   */
  _getOpenDropdowns() {
    const dropdowns = [];
    
    document.querySelectorAll('.dropdown.show, .dropdown-menu.show').forEach(dropdown => {
      const id = dropdown.id || dropdown.closest('.dropdown')?.id;
      if (id) {
        dropdowns.push(id);
      }
    });

    return dropdowns;
  }

  /**
   * Save form draft
   */
  saveFormDraft(formId, data) {
    const drafts = JSON.parse(sessionStorage.getItem(this.formDataKey) || '{}');
    drafts[formId] = {
      data,
      timestamp: Date.now()
    };
    sessionStorage.setItem(this.formDataKey, JSON.stringify(drafts));
  }

  /**
   * Get form draft
   */
  getFormDraft(formId) {
    const drafts = JSON.parse(sessionStorage.getItem(this.formDataKey) || '{}');
    const draft = drafts[formId];
    
    if (draft && Date.now() - draft.timestamp < this.expirationTime) {
      return draft.data;
    }
    
    return null;
  }

  /**
   * Clear saved state
   */
  clearSavedState() {
    sessionStorage.removeItem(this.stateKey);
  }

  /**
   * Clear all preserved data
   */
  clearAll() {
    sessionStorage.removeItem(this.stateKey);
    sessionStorage.removeItem(this.formDataKey);
    sessionStorage.removeItem(this.scrollKey);
    sessionStorage.removeItem(this.uiSettingsKey);
  }
}

// Create and export singleton instance
export const statePreserver = new StatePreserver();