import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { BrandLogoComponent } from './shared/components/brand-logo/brand-logo.component';
import { SocialAuthManagerService } from './core/auth/social-auth-manager.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, BrandLogoComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly socialAuthManager = inject(SocialAuthManagerService);
  title = 'talentus-scout-fe';

  ngOnInit(): void {
    this.socialAuthManager.handleOAuthCallbackIfPresent();
  }
}
