///////////////////////////////////////////////////////////////////////////
// Copyright 2016 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
define(['dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/query',
    'dojo/on',
    'dojo/text!./EditFields.html',
    'dijit/_TemplatedMixin',
    'jimu/BaseWidgetSetting',
    'jimu/dijit/SimpleTable',
    'jimu/dijit/Popup',
    './LookupList'
  ],
  function(declare, lang, array, query, on, template, _TemplatedMixin, BaseWidgetSetting, Table, Popup, LookupList) {
    return declare([BaseWidgetSetting, _TemplatedMixin], {
      baseClass: "jimu-widget-setting-fields-critical-facilities",
      templateString: template,
      _layerInfo: null,
      isRecognizedValues: null,

      postCreate: function() {
        this.inherited(arguments);
        this.nls = lang.mixin(this.nls, window.jimuNls.common);
        this._initFieldsTable();
        this._setFieldsTable(this._layerInfo.fieldInfos);
      },

      popupEditPage: function() {
        var fieldsPopup = new Popup({
          titleLabel: this.nls.configureFields,
          width: 640,
          maxHeight: 600,
          autoHeight: true,
          content: this,
          buttons: [{
            label: this.nls.ok,
            onClick: lang.hitch(this, function() {
              this._resetFieldInfos();
              fieldsPopup.close();
            })
          }, {
            label: this.nls.cancel,
            classNames: ['jimu-btn-vacation'],
            onClick: lang.hitch(this, function() {
              fieldsPopup.close();
            })
          }],
          onClose: lang.hitch(this, function() {
          })
        });
      },

      _initFieldsTable: function() {
        var fields2 = [{
          name: 'visible',
          title: this.nls.display,
          type: 'checkbox',
          'class': 'display'
        }, {
          name: 'fieldName',
          title: this.nls.editpageName,
          type: 'text'
        }, {
          name: 'label',
          title: this.nls.editpageAlias,
          type: 'text',
          editable: true
        }, {
          name: 'actions',
          title: this.nls.actions,
          type: 'actions',
          actions: ['up', 'down'], //actions: ['up', 'down', 'edit'],
          'class': 'actions'
        }, {
          name: 'type',
          title: '',
          type: 'text',
          editable: true,
          hidden: true
        }];
        var args2 = {
          fields: fields2,
          selectable: false,
          style: {
            'height': '300px',
            'maxHeight': '300px'
          }
        };
        this._fieldsTable = new Table(args2);
        this._fieldsTable.placeAt(this.fieldsTable);
        this._fieldsTable.startup();

        this.own(on(this._fieldsTable, 'actions-edit',
          lang.hitch(this, this._onEditFieldsClick)));
      },

      _setFieldsTable: function(fieldInfos) {
        var skipFields = ['esriFieldTypeOID', 'esriFieldTypeGlobalID'];
        array.forEach(fieldInfos, function (fieldInfo) {
          if (fieldInfo.type && skipFields.indexOf(fieldInfo.type) === -1) {
            this._fieldsTable.addRow({
              fieldName: fieldInfo.fieldName,
              label: fieldInfo.label,
              visible: fieldInfo.visible,
              type: fieldInfo.type
            });
          }
        }, this);
      },

      _onDisplayFieldChanged: function(tr) {
        var rowData = this._fieldsTable.getRowData(tr);
        if (!rowData.visible) {
          this._fieldsTable.editRow(tr, rowData);
        }
      },

      _resetFieldInfos: function() {
        var newFieldInfos = [];
        var fieldsTableData =  this._fieldsTable.getData();
        array.forEach(fieldsTableData, function(fieldData) {
          newFieldInfos.push({
            "fieldName": fieldData.fieldName,
            "label": fieldData.label,
            "visible": fieldData.visible,
            "type": fieldData.type
          });
        });
        this._layerInfo.fieldInfos = newFieldInfos;
      },

      _onEditFieldsClick: function (tr) {
        var sourceDijit = new LookupList({
          nls: this.nls,
          row: tr,
          fieldName: tr.childNodes[1].innerText,
          isRecognizedValues: this.isRecognizedValues
        });

        var popup = new Popup({
          width: 400,
          autoHeight: true,
          content: sourceDijit,
          titleLabel: this.nls.lookupList,
          buttons: [{
            label: this.nls.ok,
            onClick: lang.hitch(this, function () {
              //var sourceListRows = popup.content.sourceList.getRows();
              //this.isRecognizedValues = [];
              //array.forEach(sourceListRows, lang.hitch(this, function (tr) {
              //  this.isRecognizedValues.push(query(tr).data('config')[0]);
              //}));
              popup.close();
            })
          }, {
            label: this.nls.cancel,
            classNames: ['jimu-btn-vacation'],
            onClick: lang.hitch(this, function () {
              popup.close();
            })
          }],
          onClose: lang.hitch(this, function () {
          })
        });
      }
    });
  });
