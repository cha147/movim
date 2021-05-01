<ul class="list controls">
    <li>
        <span class="primary icon color transparent active" onclick="Preview_ajaxHide()" title="{$c->__('button.close')}">
            <i class="material-icons">arrow_back</i>
        </span>
    </li>
</ul>
{if="$embed && !empty($embed->images)"}
    <img src="{$embed->images[$imagenumber]['url']|protectPicture}"
        title="{$embed->images[$imagenumber]['url']}"
        class="transparent"/>

    {if="array_key_exists('size', $embed->images[$imagenumber])"}
        <span class="pinfo">
            {$embed->images[$imagenumber]['width']} × {$embed->images[$imagenumber]['height']}
            {if="$embed->images[$imagenumber]['size'] != 0"}
                - {$embed->images[$imagenumber]['size']|sizeToCleanSize}
            {/if}
        </span>
    {/if}

    {$previous = $imagenumber-1}
    <span class="prevnext prev {if="$imagenumber > 0"}enabled{/if}"
        onclick="Preview_ajaxGallery('{$embed->url}', {$previous})">
        <i class="material-icons">chevron_left</i>
    </span>

    {$next = $imagenumber+1}
    <span class="prevnext next {if="$imagenumber+1 < count($embed->images)"}enabled{/if}"
        onclick="Preview_ajaxGallery('{$embed->url}', {$next})">
        <i class="material-icons">chevron_right</i>
    </span>

    <span class="counter">{$imagenumber+1} / {$embed->images|count}</span>
    <div class="buttons">
        <a class="button flat color transparent" href="{$embed->images[$imagenumber]['url']}" target="_blank" download title="{$c->__('button.save')}">
            <i class="material-icons">get_app</i> {$c->__('button.save')}
        </a>
        <a class="button flat color transparent" href="#" onclick="Preview.copyToClipboard('{$embed->images[$imagenumber]['url']}')" title="{$c->__('button.copy_link')}">
            <i class="material-icons">link</i> {$c->__('button.copy_link')}
        </a>
    </div>
{/if}
