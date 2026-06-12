/**
 * YardBoss — API Client
 * Thin wrapper over fetch for all backend calls.
 * Exported as window.YB so any page can use it after loading this script.
 */

(function () {
  'use strict';

  var BASE = '';  // same-origin; proxied through Vercel vercel.json to Railway

  function handleResponse(res) {
    if (!res.ok) {
      return res.json().then(function (body) {
        throw new Error(body.error || ('HTTP ' + res.status));
      });
    }
    return res.json();
  }

  var YB = {

    // ── Tenants ────────────────────────────────────────────────────────────
    loadTenants: function () {
      return fetch(BASE + '/api/tenants').then(handleResponse);
    },

    loadTenant: function (id) {
      return fetch(BASE + '/api/tenants/' + encodeURIComponent(id)).then(handleResponse);
    },

    /**
     * saveTenant(data)
     *   - If data.id exists → PATCH /api/tenants/:id  (edit)
     *   - Otherwise         → POST  /api/tenants       (create)
     * Returns the saved tenant object.
     */
    saveTenant: function (data) {
      if (data.id) {
        return fetch(BASE + '/api/tenants/' + encodeURIComponent(data.id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(handleResponse);
      } else {
        return fetch(BASE + '/api/tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(handleResponse);
      }
    },

    deleteTenant: function (id) {
      return fetch(BASE + '/api/tenants/' + encodeURIComponent(id), {
        method: 'DELETE'
      }).then(handleResponse);
    },

    /**
     * addPayment(tenantId, payment)
     * Fetches current tenant, prepends the payment, then PATCHes.
     * Returns the updated tenant.
     */
    addPayment: function (tenantId, payment) {
      return YB.loadTenant(tenantId).then(function (tenant) {
        var payments = [payment].concat(tenant.payments || []);
        return YB.saveTenant({ id: tenantId, payments: payments });
      });
    },

    // ── Lots ───────────────────────────────────────────────────────────────
    loadLots: function () {
      return fetch(BASE + '/api/lots').then(handleResponse);
    },

    /**
     * savePricingPlans(lotId, pricingPlans)
     * Persists the centralized pricing plan config for a lot.
     */
    savePricingPlans: function (lotId, pricingPlans) {
      return fetch(BASE + '/api/lots/' + encodeURIComponent(lotId) + '/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricingPlans: pricingPlans })
      }).then(handleResponse);
    },

    // ── Branding ───────────────────────────────────────────────────────────
    loadBranding: function () {
      return fetch(BASE + '/api/branding').then(handleResponse);
    },

    saveBranding: function (branding) {
      return fetch(BASE + '/api/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding)
      }).then(handleResponse);
    },

  };

  window.YB = YB;
})();
