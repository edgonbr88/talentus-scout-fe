import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-athlete-terms-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './athlete-terms-modal.component.html',
  styleUrl: './athlete-terms-modal.component.css'
})
export class AthleteTermsModalComponent {
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
