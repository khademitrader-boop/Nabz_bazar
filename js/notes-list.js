(function(){
  'use strict';
  var listEl = document.getElementById('notesList');
  var emptyEl = document.getElementById('notesEmpty');
  if(!listEl || !window.NBNotes) return;

  var monthNames = window.NBNotes.monthNames;

  function compareKeysDesc(a, b){
    var pa = window.NBNotes.parseKey(a);
    var pb = window.NBNotes.parseKey(b);
    if(pa.y !== pb.y) return pb.y - pa.y;
    if(pa.m !== pb.m) return pb.m - pa.m;
    return pb.d - pa.d;
  }

  // Static, hard-coded icon markup only (never user data) - safe to set
  // via innerHTML. The note text itself is never touched by innerHTML
  // anywhere in this file; see render() below.
  var EDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
  var DELETE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';

  function buildNoteItem(key, text){
    var p = window.NBNotes.parseKey(key);

    var item = document.createElement('article');
    item.className = 'note-item';
    item.dataset.noteKey = key;

    var dateWrap = document.createElement('div');
    dateWrap.className = 'note-item-date';
    var daySpan = document.createElement('span');
    daySpan.className = 'note-item-day';
    daySpan.textContent = p.d.toLocaleString('fa-IR');
    var monthSpan = document.createElement('span');
    monthSpan.className = 'note-item-month';
    monthSpan.textContent = monthNames[p.m - 1] + ' ' + p.y.toLocaleString('fa-IR');
    dateWrap.appendChild(daySpan);
    dateWrap.appendChild(monthSpan);

    // Note text comes straight from the visitor via the calendar/note
    // modal - textContent is used here (never innerHTML), so it can
    // never be interpreted as markup no matter what's typed into it.
    var textEl = document.createElement('p');
    textEl.className = 'note-item-text';
    textEl.textContent = text;

    var actions = document.createElement('div');
    actions.className = 'note-item-actions';

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'note-item-btn note-item-edit';
    editBtn.setAttribute('aria-label', 'ویرایش یادداشت');
    editBtn.innerHTML = EDIT_ICON;

    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'note-item-btn note-item-delete';
    deleteBtn.setAttribute('aria-label', 'حذف یادداشت');
    deleteBtn.innerHTML = DELETE_ICON;

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(dateWrap);
    item.appendChild(textEl);
    item.appendChild(actions);
    return item;
  }

  function render(){
    var notes = window.NBNotes.load();
    var keys = Object.keys(notes).sort(compareKeysDesc);

    listEl.textContent = '';

    if(!keys.length){
      emptyEl.removeAttribute('hidden');
      return;
    }
    emptyEl.setAttribute('hidden', '');

    // Build every card in a detached fragment and attach it to the live
    // DOM once, instead of appendChild-ing each card directly (which
    // would force a reflow on every single note, one at a time).
    var fragment = document.createDocumentFragment();
    keys.forEach(function(key){
      fragment.appendChild(buildNoteItem(key, notes[key]));
    });
    listEl.appendChild(fragment);
  }

  listEl.addEventListener('click', function(e){
    var item = e.target.closest('.note-item');
    if(!item) return;
    var key = item.dataset.noteKey;

    if(e.target.closest('.note-item-delete')){
      window.NBNotes.deleteNote(key);
      return;
    }
    // Edit button, or a tap anywhere else on the card, opens it for editing.
    window.dispatchEvent(new CustomEvent('nb:open-note', {
      detail: { key: key, label: window.NBNotes.labelFor(key) }
    }));
  });

  window.addEventListener('nb:notes-changed', render);
  render();
})();
