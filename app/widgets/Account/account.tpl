<div class="tabelem" title="{$c->__('account.title')}" id="account_widget">
    <ul class="list middle active">
        <li onclick="Account_ajaxChangePassword()">
            <span class="primary icon">
                <i class="material-icons">vpn_key</i>
            </span>
            <span class="control icon gray">
                <i class="material-icons">chevron_right</i>
            </span>
            <div>
                <p class="normal line">{$c->__('account.password_change_title')}</p>
            </div>
        </li>
        <li onclick="Account_ajaxClearAccount()">
            <span class="primary icon orange">
                <i class="material-icons">eject</i>
            </span>
            <span class="control icon gray">
                <i class="material-icons">chevron_right</i>
            </span>
            <div>
                <p class="normal line">{$c->__('account.clear')}</p>
            </div>
        </li>
        <li onclick="Account_ajaxRemoveAccount()">
            <span class="primary icon red">
                <i class="material-icons">delete</i>
            </span>
            <span class="control icon gray">
                <i class="material-icons">chevron_right</i>
            </span>
            <div>
                <p class="normal line">{$c->__('account.delete')}</p>
            </div>
        </li>
    </ul>
    <div id="account_fingerprints"></div>
    <div id="account_gateways">
        {autoescape="off"}
            {$gateways}
        {/autoescape}
    </div>
</div>
